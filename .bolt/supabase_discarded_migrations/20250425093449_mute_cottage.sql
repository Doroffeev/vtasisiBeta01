/*
  # Создание таблицы групп животных

  1. Новые таблицы
    - `groups`
      - `id` (uuid, первичный ключ)
      - `number` (text)
      - `description` (text)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблицы `groups`
    - Добавление политики для чтения данных аутентифицированными пользователями
    - Добавление политики для обновления данных администраторами и менеджерами
*/

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все пользователи могут читать данные групп"
  ON groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Администраторы и менеджеры могут обновлять данные групп"
  ON groups
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'MANAGER', 'ZOOTECHNICIAN'));

-- Вставка начальных данных
INSERT INTO groups (id, number, description)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '1', 'Основное стадо'),
  ('00000000-0000-0000-0000-000000000002', '2', 'Коровы в сухостое'),
  ('00000000-0000-0000-0000-000000000003', '3', 'Молодые коровы')
ON CONFLICT (id) DO NOTHING;