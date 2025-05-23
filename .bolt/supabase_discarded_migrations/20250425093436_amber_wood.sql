/*
  # Создание таблицы пользователей

  1. Новые таблицы
    - `users`
      - `id` (uuid, первичный ключ)
      - `username` (text, уникальный)
      - `full_name` (text)
      - `role` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблицы `users`
    - Добавление политики для чтения данных аутентифицированными пользователями
    - Добавление политики для обновления данных администраторами
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Пользователи могут читать свои данные"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Администраторы могут обновлять данные пользователей"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'ADMIN');

-- Вставка начальных данных
INSERT INTO users (id, username, full_name, role, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Администратор', 'ADMIN', true),
  ('00000000-0000-0000-0000-000000000002', 'manager', 'Руководитель', 'MANAGER', true)
ON CONFLICT (username) DO NOTHING;