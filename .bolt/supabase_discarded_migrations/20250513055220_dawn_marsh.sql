/*
  # Создание таблицы отёлов
  
  1. Новые таблицы
    - `calvings` - таблица для записи отёлов
      - `id` (uuid, первичный ключ)
      - `mother_id` (uuid, внешний ключ)
      - `date` (date)
      - `status` (text)
      - `child_id` (uuid)
      - `child_number` (text)
      - `child_responder` (text)
      - `child_group_id` (uuid)
      - `child_gender` (text)
      - `child_weight` (text)
      - `notes` (text)
      - `has_mastitis` (boolean)
      - `executor_id` (uuid, внешний ключ)
      - `new_mother_group_id` (uuid, внешний ключ)
      - `created_at` (timestamptz)
      
  2. Безопасность
    - Включение RLS для новой таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для отёлов
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
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы отёлов
ALTER TABLE public.calvings ENABLE ROW LEVEL SECURITY;

-- Добавление политики безопасности для отёлов
CREATE POLICY "All authenticated users can do anything with calvings"
  ON public.calvings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);