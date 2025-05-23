/*
  # Добавление недостающих колонок в таблицу animals

  1. Изменения
     - Проверяется наличие колонки status в таблице animals и добавляется, если она отсутствует
     - Проверяются и добавляются другие важные колонки, которые могут отсутствовать в схеме

  2. Безопасность
     - Все операции выполняются внутри блоков условной проверки, чтобы избежать ошибок
     - Используется подход "добавить, если не существует" для безопасного обновления схемы
*/

DO $$
BEGIN
  -- Добавляем колонку status, если она не существует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'status'
  ) THEN
    ALTER TABLE animals ADD COLUMN status text NOT NULL DEFAULT 'Без';
  END IF;

  -- Проверяем и добавляем другие колонки, которые могут отсутствовать
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN birth_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'gender'
  ) THEN
    ALTER TABLE animals ADD COLUMN gender text CHECK (gender = ANY (ARRAY['male', 'female']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE animals ADD COLUMN group_id uuid REFERENCES groups(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'mother_id'
  ) THEN
    ALTER TABLE animals ADD COLUMN mother_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'last_calving_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN last_calving_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'last_insemination_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN last_insemination_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'insemination_count'
  ) THEN
    ALTER TABLE animals ADD COLUMN insemination_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'is_under_treatment'
  ) THEN
    ALTER TABLE animals ADD COLUMN is_under_treatment boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'has_mastitis'
  ) THEN
    ALTER TABLE animals ADD COLUMN has_mastitis boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'mastitis_start_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN mastitis_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'treatment_end_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN treatment_end_date timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'treatment_end_executor_id'
  ) THEN
    ALTER TABLE animals ADD COLUMN treatment_end_executor_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'next_calving_date'
  ) THEN
    ALTER TABLE animals ADD COLUMN next_calving_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'lactation'
  ) THEN
    ALTER TABLE animals ADD COLUMN lactation integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'responder'
  ) THEN
    ALTER TABLE animals ADD COLUMN responder text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'days_in_milk'
  ) THEN
    ALTER TABLE animals ADD COLUMN days_in_milk integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'weight'
  ) THEN
    ALTER TABLE animals ADD COLUMN weight numeric;
  END IF;
  
END $$;

-- Добавляем индексы для улучшения производительности
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_number'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_animals_number ON animals(number);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_group_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_animals_group_id ON animals(group_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
  END IF;
END $$;