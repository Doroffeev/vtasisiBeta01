/*
  # Создание и настройка таблицы calving_logs

  1. New Tables
    - `calving_logs`
      - `id` (uuid, primary key)
      - `calving_id` (uuid, foreign key to calvings)
      - `user_id` (uuid, foreign key to users)
      - `action` (text, enum: CREATE, DELETE)
      - `details` (text)
      - `timestamp` (timestamptz)
  2. Security
    - Enable RLS on `calving_logs` table
    - Add policies for data access
*/

-- Проверяем существование таблицы calving_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'calving_logs'
  ) THEN
    -- Создаем таблицу журнала отелов
    CREATE TABLE public.calving_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      calving_id uuid REFERENCES public.calvings(id) ON DELETE SET NULL,
      user_id uuid REFERENCES public.users(id),
      action text NOT NULL CHECK (action IN ('CREATE', 'DELETE')),
      details text,
      timestamp timestamptz DEFAULT now()
    );

    -- Включаем RLS для таблицы журнала отелов
    ALTER TABLE public.calving_logs ENABLE ROW LEVEL SECURITY;

    -- Политики доступа для таблицы журнала отелов
    CREATE POLICY "All authenticated users can do anything with calving_logs"
      ON public.calving_logs
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;