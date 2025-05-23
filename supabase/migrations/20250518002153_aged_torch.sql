/*
  # Отключение RLS и настройка таблиц

  1. Отключение RLS
    - Отключает Row Level Security для всех таблиц
  2. Создание отсутствующих таблиц
    - Создаёт таблицы, если они не существуют
  3. Проверка структуры таблиц
    - Добавляет недостающие колонки
*/

-- Отключаем RLS для всех таблиц
DO $$
DECLARE
    _table_name text;
BEGIN
    FOR _table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', _table_name);
    END LOOP;
END $$;

-- Проверка и создание таблицы animals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'animals'
  ) THEN
    CREATE TABLE animals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number text NOT NULL DEFAULT '',
      group_id uuid REFERENCES groups(id),
      status text NOT NULL DEFAULT 'Без',
      birth_date date,
      gender text CHECK (gender = ANY (ARRAY['male', 'female'])),
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
  END IF;
END $$;

-- Проверка и создание таблицы medication_usages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'medication_usages'
  ) THEN
    CREATE TABLE medication_usages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      operation_id uuid,
      medication_id uuid,
      quantity integer NOT NULL,
      total_price numeric NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Создаем индексы для таблицы animals
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'number'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_number'
  ) THEN
    CREATE INDEX idx_animals_number ON animals(number);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'group_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_group_id'
  ) THEN
    CREATE INDEX idx_animals_group_id ON animals(group_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_animals_status'
  ) THEN
    CREATE INDEX idx_animals_status ON animals(status);
  END IF;
END $$;

-- Проверяем и создаем таблицы для других сущностей
DO $$
BEGIN
  -- Проверяем существование таблицы groups
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'groups'
  ) THEN
    CREATE TABLE groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Проверяем таблицу buyers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'buyers'
  ) THEN
    CREATE TABLE buyers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      phone text NOT NULL,
      vehicle_number text NOT NULL,
      address text,
      contact_person text,
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Проверяем таблицу shipments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'shipments'
  ) THEN
    CREATE TABLE shipments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      animal_id uuid,
      animal_number text,
      buyer_id uuid REFERENCES buyers(id),
      buyer_name text,
      vehicle_number text NOT NULL,
      driver_name text NOT NULL,
      proxy_number text NOT NULL,
      released_by_id uuid,
      releaser_name text,
      accepted_by text NOT NULL,
      price numeric,
      weight numeric,
      total_amount numeric,
      comments text,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      deleted_by uuid,
      deleted_reason text
    );
  END IF;

  -- Проверяем таблицу shipment_animals
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'shipment_animals'
  ) THEN
    CREATE TABLE shipment_animals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      shipment_id uuid REFERENCES shipments(id),
      animal_id uuid,
      animal_number text NOT NULL,
      weight numeric,
      price numeric,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Проверяем таблицу users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'users'
  ) THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE NOT NULL,
      full_name text NOT NULL,
      role text NOT NULL CHECK (role = ANY (ARRAY['ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR'])),
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Таблица для ветеринарных операций
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'vet_operations'
  ) THEN
    CREATE TABLE vet_operations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      time text NOT NULL,
      code text NOT NULL,
      price numeric,
      executor_id uuid,
      result text,
      animal_id uuid,
      is_deleted boolean DEFAULT false,
      deletion_reason text,
      deletion_date timestamptz,
      is_cancelled boolean DEFAULT false,
      cancellation_reason text,
      cancellation_date timestamptz,
      created_at timestamptz DEFAULT now()
    );
  END IF;

END $$;

-- Проверяем наличие записи админа в таблице users, если ее нет - создаем
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE username = 'admin'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'users'
  ) THEN
    INSERT INTO users (username, full_name, role)
    VALUES ('admin', 'Администратор', 'ADMIN');
  END IF;
END $$;