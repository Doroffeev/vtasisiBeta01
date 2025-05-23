/*
  # Создание таблиц для движения поголовья
  
  1. Новые таблицы
    - `movements` - таблица для записи перемещений животных между группами
      - `id` (uuid, первичный ключ)
      - `date` (date, дата перемещения)
      - `from_group` (uuid, ссылка на исходную группу)
      - `to_group` (uuid, ссылка на целевую группу)
      - `reason` (text, причина перемещения)
      - `created_at` (timestamptz, дата создания записи)
    
    - `movement_animals` - таблица связи перемещений с животными
      - `id` (uuid, первичный ключ)
      - `movement_id` (uuid, ссылка на перемещение)
      - `animal_id` (uuid, ссылка на животное)
  
  2. Безопасность
    - Включение RLS для таблиц
    - Добавление политик для управления доступом
*/

-- Создание таблицы для перемещений
CREATE TABLE IF NOT EXISTS public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  from_group uuid REFERENCES public.groups(id),
  to_group uuid REFERENCES public.groups(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы перемещений
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для перемещений
CREATE POLICY "All authenticated users can do anything with movements"
  ON public.movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы связи перемещений с животными
CREATE TABLE IF NOT EXISTS public.movement_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid REFERENCES public.movements(id),
  animal_id uuid
);

-- Включение RLS для таблицы связи
ALTER TABLE public.movement_animals ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для связи
CREATE POLICY "All authenticated users can do anything with movement_animals"
  ON public.movement_animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);