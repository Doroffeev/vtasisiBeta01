/*
  # Создание таблиц для отелов и логов отелов
  
  1. Новые таблицы
    - `calvings` - таблица отелов
    - `calving_logs` - таблица логов отелов
  
  2. Безопасность
    - Включение RLS для обеих таблиц
    - Добавление политик с проверкой их существования
*/

-- Создание таблицы отелов
CREATE TABLE IF NOT EXISTS public.calvings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_id uuid,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'abortion', 'stillbirth')),
  child_id uuid,
  child_number text,
  child_responder text,
  child_group_id uuid,
  child_gender text CHECK (child_gender IN ('male', 'female')),
  child_weight text,
  notes text,
  has_mastitis boolean DEFAULT false,
  executor_id uuid,
  new_mother_group_id uuid,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text
);

-- Включение RLS для таблицы отелов
ALTER TABLE public.calvings ENABLE ROW LEVEL SECURITY;

-- Создание таблицы логов отелов
CREATE TABLE IF NOT EXISTS public.calving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calving_id uuid REFERENCES public.calvings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы логов отелов
ALTER TABLE public.calving_logs ENABLE ROW LEVEL SECURITY;

-- Безопасное создание политик с проверкой их существования
DO $$
BEGIN
  -- Проверка существования политики для таблицы отелов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calvings' AND policyname = 'All authenticated users can do anything with calvings'
  ) THEN
    -- Создание политики для таблицы отелов
    CREATE POLICY "All authenticated users can do anything with calvings"
      ON public.calvings
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Проверка существования политики для таблицы логов отелов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'calving_logs' AND policyname = 'All authenticated users can do anything with calving_logs'
  ) THEN
    -- Создание политики для таблицы логов отелов
    CREATE POLICY "All authenticated users can do anything with calving_logs"
      ON public.calving_logs
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;