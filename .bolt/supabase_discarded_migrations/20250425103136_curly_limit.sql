/*
  # Исправление таблицы пользователей

  1. Создаем таблицу users безопасным способом
  2. Настраиваем Row Level Security и политики
  3. Добавляем начальных пользователей
*/

DO $$
BEGIN
  -- Проверяем существование таблицы users
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'users'
  ) THEN
    -- Создаем таблицу users, если она не существует
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text UNIQUE NOT NULL,
      full_name text NOT NULL,
      role text NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR')),
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now()
    );
    
    -- Включаем Row Level Security
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Проверяем и создаем политики доступа
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    -- Политика для чтения своих данных
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins can perform all operations on users'
  ) THEN
    -- Политика для администраторов
    CREATE POLICY "Admins can perform all operations on users"
      ON users
      FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      );
  END IF;

  -- Проверяем наличие пользователей и добавляем, если их нет
  IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
    -- Добавляем начальных пользователей
    INSERT INTO users (username, full_name, role, is_active)
    VALUES 
      ('admin', 'Администратор', 'ADMIN', true),
      ('manager', 'Руководитель', 'MANAGER', true);
  END IF;
END $$;