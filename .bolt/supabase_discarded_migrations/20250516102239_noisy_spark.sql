/*
  # Создание таблиц для модулей "Ветоперации" и "Схемы лечения"

  1. Новые таблицы
    - `vet_operations` - таблица ветеринарных операций
    - `medication_usages` - таблица использования препаратов в операциях
    - `operation_comments` - таблица комментариев к операциям
    - `treatment_schemes` - таблица схем лечения
    - `treatment_steps` - таблица этапов лечения
    - `treatment_step_medications` - таблица препаратов для этапов лечения
    - `active_treatments` - таблица активных лечений
    - `completed_steps` - таблица выполненных этапов лечения
    - `missed_steps` - таблица пропущенных этапов лечения
  
  2. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик для управления доступом
*/

-- Создание таблицы ветеринарных операций
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
  deletion_reason text,
  deletion_date timestamptz,
  is_cancelled boolean DEFAULT false,
  cancellation_reason text,
  cancellation_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы ветеринарных операций
ALTER TABLE public.vet_operations ENABLE ROW LEVEL SECURITY;

-- Создание таблицы использования препаратов в операциях
CREATE TABLE IF NOT EXISTS public.medication_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.vet_operations(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы использования препаратов
ALTER TABLE public.medication_usages ENABLE ROW LEVEL SECURITY;

-- Создание таблицы комментариев к операциям
CREATE TABLE IF NOT EXISTS public.operation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.vet_operations(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы комментариев
ALTER TABLE public.operation_comments ENABLE ROW LEVEL SECURITY;

-- Создание таблицы схем лечения
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

-- Создание таблицы этапов лечения
CREATE TABLE IF NOT EXISTS public.treatment_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id) ON DELETE CASCADE,
  day integer NOT NULL,
  procedure text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы этапов лечения
ALTER TABLE public.treatment_steps ENABLE ROW LEVEL SECURITY;

-- Создание таблицы препаратов для этапов лечения
CREATE TABLE IF NOT EXISTS public.treatment_step_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid REFERENCES public.treatment_steps(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы препаратов для этапов
ALTER TABLE public.treatment_step_medications ENABLE ROW LEVEL SECURITY;

-- Создание таблицы активных лечений
CREATE TABLE IF NOT EXISTS public.active_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id),
  animal_id uuid,
  start_date date NOT NULL,
  current_step integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completion_type text CHECK (completion_type IN ('discharge', 'disposal')),
  completion_date timestamptz,
  completion_comment text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы активных лечений
ALTER TABLE public.active_treatments ENABLE ROW LEVEL SECURITY;

-- Создание таблицы выполненных этапов лечения
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

-- Создание таблицы пропущенных этапов лечения
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

CREATE POLICY "All authenticated users can do anything with operation_comments"
  ON public.operation_comments
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