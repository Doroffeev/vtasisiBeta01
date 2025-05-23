/*
  # Создание таблиц для модуля "Схемы лечения"

  1. Новые Таблицы
    - `treatment_schemes` - схемы лечения
      - `id` (uuid, первичный ключ)
      - `name` (text, название схемы)
      - `description` (text, описание схемы)
      - `supervisor_id` (uuid, ссылка на пользователя-ветврача)
      - `is_active` (boolean, активна ли схема)
      - `created_at` (timestamptz, дата создания)
    
    - `treatment_steps` - этапы лечения
      - `id` (uuid, первичный ключ)
      - `scheme_id` (uuid, ссылка на схему лечения)
      - `day` (integer, день этапа)
      - `procedure` (text, описание процедуры)
      - `created_at` (timestamptz, дата создания)
    
    - `treatment_step_medications` - препараты для этапов лечения
      - `id` (uuid, первичный ключ)
      - `step_id` (uuid, ссылка на этап лечения)
      - `medication_id` (uuid, ссылка на препарат)
      - `quantity` (integer, количество)
      - `total_price` (numeric, общая стоимость)
      - `created_at` (timestamptz, дата создания)
    
    - `active_treatments` - активные лечения
      - `id` (uuid, первичный ключ)
      - `scheme_id` (uuid, ссылка на схему лечения)
      - `animal_id` (uuid, ссылка на животное)
      - `start_date` (date, дата начала)
      - `current_step` (integer, текущий этап)
      - `is_completed` (boolean, завершено ли лечение)
      - `completion_type` (text, тип завершения: выписка/выбытие)
      - `completion_date` (timestamptz, дата завершения)
      - `completion_comment` (text, комментарий к завершению)
      - `created_at` (timestamptz, дата создания)
    
    - `completed_steps` - выполненные этапы лечения
      - `id` (uuid, первичный ключ)
      - `treatment_id` (uuid, ссылка на активное лечение)
      - `step_id` (uuid, ссылка на этап лечения)
      - `date` (date, дата выполнения)
      - `result` (text, результат)
      - `executor_id` (uuid, ссылка на исполнителя)
      - `created_at` (timestamptz, дата создания)
    
    - `missed_steps` - пропущенные этапы лечения
      - `id` (uuid, первичный ключ)
      - `treatment_id` (uuid, ссылка на активное лечение)
      - `step_id` (uuid, ссылка на этап лечения)
      - `date` (date, ожидаемая дата выполнения)
      - `created_at` (timestamptz, дата создания)

  2. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик для аутентифицированных пользователей
*/

-- Таблица схем лечения
CREATE TABLE IF NOT EXISTS treatment_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  supervisor_id uuid REFERENCES users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Таблица этапов лечения
CREATE TABLE IF NOT EXISTS treatment_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES treatment_schemes(id) ON DELETE CASCADE,
  day integer NOT NULL,
  procedure text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблица препаратов для этапов лечения
CREATE TABLE IF NOT EXISTS treatment_step_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid REFERENCES treatment_steps(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id),
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Таблица активных лечений
CREATE TABLE IF NOT EXISTS active_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES treatment_schemes(id),
  animal_id uuid,
  start_date date NOT NULL,
  current_step integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completion_type text CHECK (completion_type = ANY (ARRAY['discharge', 'disposal'])),
  completion_date timestamptz,
  completion_comment text,
  created_at timestamptz DEFAULT now()
);

-- Таблица выполненных этапов лечения
CREATE TABLE IF NOT EXISTS completed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES treatment_steps(id),
  date date NOT NULL,
  result text NOT NULL,
  executor_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Таблица пропущенных этапов лечения
CREATE TABLE IF NOT EXISTS missed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES treatment_steps(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для всех таблиц
ALTER TABLE treatment_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_step_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE missed_steps ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для аутентифицированных пользователей
CREATE POLICY "All authenticated users can do anything with treatment_schemes"
  ON treatment_schemes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with treatment_steps"
  ON treatment_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with treatment_step_med"
  ON treatment_step_medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with active_treatments"
  ON active_treatments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with completed_steps"
  ON completed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with missed_steps"
  ON missed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);