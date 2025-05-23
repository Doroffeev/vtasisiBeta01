/*
  # Создание таблицы осеменений
  
  1. Новые таблицы
    - `inseminations` - таблица для записи осеменений
      - `id` (uuid, первичный ключ)
      - `date` (date, дата осеменения)
      - `time` (text, время осеменения)
      - `animal_id` (uuid, ссылка на животное)
      - `bull_id` (uuid, ссылка на быка)
      - `executor_id` (uuid, ссылка на исполнителя)
      - `status` (text, статус осеменения: 'ОСЕМ', 'СТЕЛ', 'ЯЛОВАЯ')
      - `is_deleted` (boolean, признак удаления)
      - `deleted_at` (timestamp, дата удаления)
      - `deleted_by` (uuid, кто удалил)
      - `deletion_reason` (text, причина удаления)
      - `created_at` (timestamptz, дата создания записи)
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для осеменений
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

-- Добавление политики безопасности для осеменений
CREATE POLICY "All authenticated users can do anything with inseminations"
  ON public.inseminations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы для журнала осеменений
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

-- Создание политик безопасности для журнала
CREATE POLICY "All authenticated users can do anything with insemination_logs"
  ON public.insemination_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Добавление индекса для улучшения производительности запросов по животным
CREATE INDEX IF NOT EXISTS idx_inseminations_animal_id ON public.inseminations(animal_id);

-- Добавление индекса по статусу для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_inseminations_status ON public.inseminations(status);

-- Добавление индекса по дате для сортировки
CREATE INDEX IF NOT EXISTS idx_inseminations_date ON public.inseminations(date);