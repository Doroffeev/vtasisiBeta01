/*
  # Создание и настройка таблицы animals

  1. Таблица
    - `animals` - таблица для хранения данных о животных
      - `id` (uuid, первичный ключ)
      - `name` (text, номер животного)
      - `group_id` (uuid, внешний ключ на группу)
      - `status` (text, статус животного)
      - Дополнительные поля для хранения информации о животном
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для животных (если не существует)
CREATE TABLE IF NOT EXISTS public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_id uuid REFERENCES public.groups(id),
  status text NOT NULL DEFAULT 'Без',
  birth_date date,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  mother_id uuid,
  last_calving_date date,
  last_insemination_date date,
  insemination_count integer DEFAULT 0,
  is_under_treatment boolean DEFAULT false,
  has_mastitis boolean DEFAULT false,
  mastitis_start_date date,
  treatment_end_date timestamptz,
  treatment_end_executor_id uuid,
  next_calving_date date,
  lactation integer DEFAULT 0,
  responder text,
  days_in_milk integer,
  weight numeric,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы животных
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для доступа к животным
CREATE POLICY "All authenticated users can do anything with animals"
  ON public.animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_animals_name ON public.animals(name);
CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);