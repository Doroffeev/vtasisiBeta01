/*
  # Добавление таблицы журнала отёлов
  
  1. Новые таблицы
    - `calving_logs` - таблица для хранения журнала действий с отёлами
      - `id` (uuid, первичный ключ)
      - `calving_id` (uuid, внешний ключ)
      - `user_id` (uuid, внешний ключ)
      - `action` (text, тип действия)
      - `details` (text, детали действия)
      - `timestamp` (timestamptz, время записи)
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для хранения журнала действий с отёлами
CREATE TABLE IF NOT EXISTS public.calving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calving_id uuid REFERENCES public.calvings(id),
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала
ALTER TABLE public.calving_logs ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности
CREATE POLICY "All authenticated users can do anything with calving_logs"
  ON public.calving_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);