/*
  # Фикс структуры таблицы animals
  
  1. Создание таблицы animals, если она не существует
  2. Добавление недостающих колонок в таблицу
  3. Создание необходимых индексов
*/

-- Сначала проверяем, существует ли таблица animals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'animals'
  ) THEN
    CREATE TABLE animals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number text NOT NULL,
      status text NOT NULL DEFAULT 'Без',
      birth_date date,
      gender text CHECK (gender = ANY (ARRAY['male', 'female'])),
      group_id uuid REFERENCES groups(id),
      mother_id uuid,
      last_calving_date date,
      last_insemination_date date,
      insemination_count integer DEFAULT 0,
      is_under_treatment boolean DEFAULT false,
      has_mastitis boolean DEFAULT false,
      mastitis_start_date date,
      treatment_end_date timestamp with time zone,
      treatment_end_executor_id uuid,
      next_calving_date date,
      lactation integer DEFAULT 0,
      responder text,
      days_in_milk integer,
      weight numeric,
      created_at timestamp with time zone DEFAULT now()
    );
  ELSE
    -- Добавляем только отсутствующие колонки
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'animals' AND column_name = 'number'
    ) THEN
      ALTER TABLE animals ADD COLUMN number text NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'animals' AND column_name = 'status'
    ) THEN
      ALTER TABLE animals ADD COLUMN status text NOT NULL DEFAULT 'Без';
    END IF;

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
  END IF;
END $$;

-- Добавляем индексы только после проверки существования колонок
DO $$
BEGIN
  -- Проверяем, что колонка number существует, прежде чем создавать индекс
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'number'
  ) THEN
    -- Только потом проверяем, существует ли индекс
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_number'
    ) THEN
      CREATE INDEX idx_animals_number ON animals(number);
    END IF;
  END IF;
  
  -- Аналогично для других колонок
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'group_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_group_id'
    ) THEN
      CREATE INDEX idx_animals_group_id ON animals(group_id);
    END IF;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'status'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_status'
    ) THEN
      CREATE INDEX idx_animals_status ON animals(status);
    END IF;
  END IF;
END $$;