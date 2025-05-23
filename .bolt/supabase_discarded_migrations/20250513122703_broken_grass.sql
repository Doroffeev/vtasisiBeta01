/*
  # Создание таблиц осеменений с безопасными проверками существования
  
  1. Новые таблицы и объекты:
    - Таблица `inseminations` для записи осеменений
    - Таблица `insemination_logs` для журнала осеменений
    - Индексы для оптимизации запросов
    - Политики безопасности для RLS
  
  2. Особенности:
    - Все создания обернуты в проверки существования
    - Корректное применение при повторном выполнении
*/

-- Создание таблицы для осеменений с проверкой существования
CREATE TABLE IF NOT EXISTS public.inseminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time text NOT NULL,
  animal_id uuid,
  bull_id uuid REFERENCES public.bulls(id),
  executor_id uuid REFERENCES public.employees(id),
  status text NOT NULL CHECK (status IN ('ОСЕМ', 'СТЕЛ', 'ЯЛОВАЯ')),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы осеменений
ALTER TABLE public.inseminations ENABLE ROW LEVEL SECURITY;

-- Безопасное добавление политики с проверкой существования
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inseminations' AND policyname = 'All authenticated users can do anything with inseminations'
  ) THEN
    CREATE POLICY "All authenticated users can do anything with inseminations"
      ON public.inseminations
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Создание таблицы для журнала осеменений с проверкой существования
CREATE TABLE IF NOT EXISTS public.insemination_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insemination_id uuid REFERENCES public.inseminations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала
ALTER TABLE public.insemination_logs ENABLE ROW LEVEL SECURITY;

-- Безопасное добавление политики для журнала с проверкой существования
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'insemination_logs' AND policyname = 'All authenticated users can do anything with insemination_logs'
  ) THEN
    CREATE POLICY "All authenticated users can do anything with insemination_logs"
      ON public.insemination_logs
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Безопасное добавление индексов с проверкой существования
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inseminations' AND indexname = 'idx_inseminations_animal_id'
  ) THEN
    CREATE INDEX idx_inseminations_animal_id ON public.inseminations(animal_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inseminations' AND indexname = 'idx_inseminations_status'
  ) THEN
    CREATE INDEX idx_inseminations_status ON public.inseminations(status);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'inseminations' AND indexname = 'idx_inseminations_date'
  ) THEN
    CREATE INDEX idx_inseminations_date ON public.inseminations(date);
  END IF;
END $$;