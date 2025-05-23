/*
  # Создание таблиц для ветеринарных операций
  
  1. Новые таблицы
    - `vet_operations` - таблица для хранения ветеринарных операций
      - `id` (uuid, первичный ключ)
      - `date` (date, дата операции)
      - `time` (text, время операции)
      - `code` (text, код операции)
      - `price` (numeric, цена операции)
      - `executor_id` (uuid, ссылка на исполнителя)
      - `result` (text, результат операции)
      - `animal_id` (uuid, ссылка на животное)
      - `is_deleted` (boolean, признак удаления)
      - `is_cancelled` (boolean, признак отмены)
      - `deletion_reason` (text, причина удаления)
      - `cancellation_reason` (text, причина отмены)
      - `deletion_date` (timestamptz, дата удаления)
      - `cancellation_date` (timestamptz, дата отмены)
      - `created_at` (timestamptz, дата создания записи)
    
    - `medication_usages` - таблица для хранения использованных препаратов
      - `id` (uuid, первичный ключ)
      - `operation_id` (uuid, ссылка на операцию)
      - `medication_id` (uuid, ссылка на препарат)
      - `quantity` (numeric, количество)
      - `total_price` (numeric, общая стоимость)
      - `created_at` (timestamptz, дата создания записи)
    
    - `treatment_schemes` - таблица для хранения схем лечения
      - `id` (uuid, первичный ключ)
      - `name` (text, название схемы)
      - `description` (text, описание схемы)
      - `supervisor_id` (uuid, ссылка на ответственного)
      - `is_active` (boolean, активна ли схема)
      - `created_at` (timestamptz, дата создания записи)
    
    - `treatment_steps` - таблица для хранения этапов схемы лечения
      - `id` (uuid, первичный ключ)
      - `scheme_id` (uuid, ссылка на схему)
      - `day` (integer, день этапа)
      - `procedure` (text, описание процедуры)
      - `created_at` (timestamptz, дата создания записи)
    
    - `active_treatments` - таблица для хранения активных лечений
      - `id` (uuid, первичный ключ)
      - `scheme_id` (uuid, ссылка на схему)
      - `animal_id` (uuid, ссылка на животное)
      - `start_date` (date, дата начала)
      - `current_step` (integer, текущий этап)
      - `is_completed` (boolean, завершено ли лечение)
      - `completion_type` (text, тип завершения)
      - `completion_date` (date, дата завершения)
      - `completion_comment` (text, комментарий к завершению)
      - `created_at` (timestamptz, дата создания записи)
    
    - `completed_steps` - таблица для хранения выполненных этапов
      - `id` (uuid, первичный ключ)
      - `treatment_id` (uuid, ссылка на лечение)
      - `step_id` (uuid, ссылка на этап)
      - `date` (date, дата выполнения)
      - `result` (text, результат)
      - `executor_id` (uuid, ссылка на исполнителя)
      - `created_at` (timestamptz, дата создания записи)
  
  2. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик для управления доступом
*/

-- Создание таблицы для ветеринарных операций
CREATE TABLE IF NOT EXISTS public.vet_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time text NOT NULL,
  code text NOT NULL,
  price numeric,
  executor_id uuid REFERENCES public.users(id),
  result text,
  animal_id uuid,
  is_deleted boolean DEFAULT false,
  is_cancelled boolean DEFAULT false,
  deletion_reason text,
  cancellation_reason text,
  deletion_date timestamptz,
  cancellation_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы ветеринарных операций
ALTER TABLE public.vet_operations ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для использованных препаратов
CREATE TABLE IF NOT EXISTS public.medication_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.vet_operations(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы использованных препаратов
ALTER TABLE public.medication_usages ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для схем лечения
CREATE TABLE IF NOT EXISTS public.treatment_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  supervisor_id uuid REFERENCES public.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы схем лечения
ALTER TABLE public.treatment_schemes ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для этапов схемы лечения
CREATE TABLE IF NOT EXISTS public.treatment_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id) ON DELETE CASCADE,
  day integer NOT NULL,
  procedure text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы этапов схемы лечения
ALTER TABLE public.treatment_steps ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для хранения препаратов, используемых на этапе
CREATE TABLE IF NOT EXISTS public.treatment_step_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid REFERENCES public.treatment_steps(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы препаратов этапа
ALTER TABLE public.treatment_step_medications ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для активных лечений
CREATE TABLE IF NOT EXISTS public.active_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id),
  animal_id uuid,
  start_date date NOT NULL,
  current_step integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completion_type text CHECK (completion_type IN ('discharge', 'disposal')),
  completion_date date,
  completion_comment text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы активных лечений
ALTER TABLE public.active_treatments ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для выполненных этапов
CREATE TABLE IF NOT EXISTS public.completed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES public.active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.treatment_steps(id),
  date date NOT NULL,
  result text NOT NULL,
  executor_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы выполненных этапов
ALTER TABLE public.completed_steps ENABLE ROW LEVEL SECURITY;

-- Создание таблицы для пропущенных этапов
CREATE TABLE IF NOT EXISTS public.missed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES public.active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.treatment_steps(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы пропущенных этапов
ALTER TABLE public.missed_steps ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для всех таблиц
CREATE POLICY "All authenticated users can do anything with vet_operations"
  ON public.vet_operations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with medication_usages"
  ON public.medication_usages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with treatment_schemes"
  ON public.treatment_schemes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with treatment_steps"
  ON public.treatment_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with treatment_step_medications"
  ON public.treatment_step_medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with active_treatments"
  ON public.active_treatments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with completed_steps"
  ON public.completed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "All authenticated users can do anything with missed_steps"
  ON public.missed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);