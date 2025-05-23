/*
  # Создание таблиц для схем лечения и активных лечений

  1. Новые таблицы
    - `treatment_schemes` - схемы лечения
    - `treatment_steps` - этапы лечения
    - `treatment_step_medications` - препараты для этапов
    - `active_treatments` - активные лечения
    - `completed_steps` - выполненные этапы
    - `missed_steps` - пропущенные этапы
  2. Security
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

-- Проверка и создание политик безопасности для аутентифицированных пользователей
DO $$
BEGIN
    -- Проверка существования политики для treatment_schemes
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'treatment_schemes' 
        AND policyname = 'All authenticated users can do anything with treatment_schemes'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with treatment_schemes"
        ON treatment_schemes
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- Проверка существования политики для treatment_steps
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'treatment_steps' 
        AND policyname = 'All authenticated users can do anything with treatment_steps'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with treatment_steps"
        ON treatment_steps
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- Проверка существования политики для treatment_step_medications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'treatment_step_medications' 
        AND policyname = 'All authenticated users can do anything with treatment_step_med'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with treatment_step_med"
        ON treatment_step_medications
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- Проверка существования политики для active_treatments
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'active_treatments' 
        AND policyname = 'All authenticated users can do anything with active_treatments'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with active_treatments"
        ON active_treatments
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- Проверка существования политики для completed_steps
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'completed_steps' 
        AND policyname = 'All authenticated users can do anything with completed_steps'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with completed_steps"
        ON completed_steps
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    -- Проверка существования политики для missed_steps
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'missed_steps' 
        AND policyname = 'All authenticated users can do anything with missed_steps'
    ) THEN
        CREATE POLICY "All authenticated users can do anything with missed_steps"
        ON missed_steps
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;