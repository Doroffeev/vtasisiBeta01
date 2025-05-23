/*
  # Создание таблицы животных
  
  1. Новые таблицы
    - `animals` - таблица для хранения информации о животных
      - `id` (uuid, первичный ключ)
      - `number` (text, номер животного)
      - `group_id` (uuid, ссылка на группу)
      - `status` (text, статус животного)
      - `birth_date` (date, дата рождения)
      - `gender` (text, пол животного)
      - `mother_id` (uuid, ссылка на мать)
      - `last_calving_date` (date, дата последнего отёла)
      - `last_insemination_date` (date, дата последнего осеменения)
      - `insemination_count` (integer, количество осеменений)
      - `is_under_treatment` (boolean, находится ли на лечении)
      - `has_mastitis` (boolean, наличие мастита)
      - `mastitis_start_date` (date, дата начала мастита)
      - `treatment_end_date` (date, дата окончания лечения)
      - `treatment_end_executor_id` (uuid, кто завершил лечение)
      - `next_calving_date` (date, дата следующего отёла)
      - `lactation` (text, лактация)
      - `responder` (text, номер респондера)
      - `days_in_milk` (text, дней в доении)
      - `weight` (text, вес животного)
      - `created_at` (timestamptz, дата создания записи)
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для животных
CREATE TABLE IF NOT EXISTS public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  group_id uuid REFERENCES public.groups(id),
  status text NOT NULL,
  birth_date date,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  mother_id uuid,
  last_calving_date date,
  last_insemination_date date,
  insemination_count integer,
  is_under_treatment boolean DEFAULT false,
  has_mastitis boolean DEFAULT false,
  mastitis_start_date date,
  treatment_end_date date,
  treatment_end_executor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  next_calving_date date,
  lactation text,
  responder text,
  days_in_milk text,
  weight text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы животных
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для животных
CREATE POLICY "All authenticated users can do anything with animals"
  ON public.animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Добавление индексов для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_animals_number ON public.animals(number);
CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);