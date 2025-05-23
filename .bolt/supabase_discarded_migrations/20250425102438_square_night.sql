/*
  # Создание таблицы пользователей и политик безопасности

  1. Новые таблицы
    - `users` - таблица пользователей системы
      - `id` (uuid, первичный ключ)
      - `username` (text, уникальный)
      - `full_name` (text)
      - `role` (text, с проверкой допустимых значений)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
  
  2. Безопасность
    - Включение RLS для таблицы `users`
    - Добавление политик для чтения собственных данных
    - Добавление политик для администраторов
  
  3. Начальные данные
    - Добавление пользователей admin и manager
*/

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Безопасное создание политик с проверкой существования
DO $$
BEGIN
  -- Проверка существования политики для чтения собственных данных
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Проверка существования политики для администраторов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins can perform all operations on users'
  ) THEN
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
END $$;

-- Добавление начальных пользователей
INSERT INTO users (username, full_name, role, is_active)
VALUES 
  ('admin', 'Администратор', 'ADMIN', true),
  ('manager', 'Руководитель', 'MANAGER', true)
ON CONFLICT (username) DO NOTHING;