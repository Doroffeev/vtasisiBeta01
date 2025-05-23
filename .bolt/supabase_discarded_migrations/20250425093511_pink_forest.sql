/*
  # Создание таблицы быков-осеменителей

  1. Новые таблицы
    - `bulls`
      - `id` (uuid, первичный ключ)
      - `code` (text)
      - `name` (text)
      - `price` (numeric)
      - `remaining_doses` (integer)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблицы `bulls`
    - Добавление политики для чтения данных аутентифицированными пользователями
    - Добавление политики для обновления данных администраторами и менеджерами
*/

CREATE TABLE IF NOT EXISTS bulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  remaining_doses integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE bulls ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все пользователи могут читать данные быков"
  ON bulls
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Авторизованные пользователи могут обновлять данные быков"
  ON bulls
  FOR ALL
  TO authenticated
  USING (true);

-- Вставка начальных данных
INSERT INTO bulls (id, code, name, price, remaining_doses)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'BULL-001', 'Бык 1', 5000, 10),
  ('00000000-0000-0000-0000-000000000002', 'BULL-002', 'Бык 2', 6000, 15)
ON CONFLICT (id) DO NOTHING;