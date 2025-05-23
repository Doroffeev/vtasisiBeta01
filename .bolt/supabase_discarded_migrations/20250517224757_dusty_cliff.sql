/*
  # Создание таблицы животных
  
  1. Новые таблицы
    - `animals` - таблица для хранения данных о животных
      - `id` (uuid, первичный ключ)
      - `number` (text, номер животного)
      - `group_id` (uuid, внешний ключ на группу)
      - `status` (text, статус животного)
      - `birth_date` (date, дата рождения)
      - `gender` (text, пол животного)
      - `mother_id` (uuid, ссылка на мать)
      - `last_calving_date` (date, дата последнего отела)
      - `last_insemination_date` (date, дата последнего осеменения)
      - `insemination_count` (integer, количество осеменений)
      - `is_under_treatment` (boolean, находится ли на лечении)
      - `has_mastitis` (boolean, наличие мастита)
      - `mastitis_start_date` (date, дата начала мастита)
      - `treatment_end_date` (timestamp, дата окончания лечения)
      - `treatment_end_executor_id` (uuid, кто завершил лечение)
      - `next_calving_date` (date, дата следующего отела)
      - `lactation` (integer, номер лактации)
      - `responder` (text, номер респондера)
      - `days_in_milk` (integer, дней в доении)
      - `weight` (numeric, вес животного)
      - `created_at` (timestamp, дата создания записи)
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Проверяем существование таблицы animals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'animals'
  ) THEN
    -- Создаем таблицу animals
    CREATE TABLE public.animals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number text NOT NULL,
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

    -- Включаем RLS для таблицы animals
    ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

    -- Добавляем политику безопасности для animals
    CREATE POLICY "All authenticated users can do anything with animals"
      ON public.animals
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
    -- Создаем индексы для оптимизации запросов
    CREATE INDEX IF NOT EXISTS idx_animals_number ON public.animals(number);
    CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
    CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);
    
    -- Добавляем проверки для числовых полей
    ALTER TABLE public.animals
    ADD CONSTRAINT animals_weight_check CHECK (weight IS NULL OR weight >= 0);
    
    ALTER TABLE public.animals
    ADD CONSTRAINT animals_lactation_check CHECK (lactation IS NULL OR lactation >= 0);
    
    ALTER TABLE public.animals
    ADD CONSTRAINT animals_insemination_count_check CHECK (insemination_count IS NULL OR insemination_count >= 0);
    
    ALTER TABLE public.animals
    ADD CONSTRAINT animals_days_in_milk_check CHECK (days_in_milk IS NULL OR days_in_milk >= 0);
  END IF;
END $$;