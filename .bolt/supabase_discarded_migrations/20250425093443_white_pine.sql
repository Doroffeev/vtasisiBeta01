/*
  # Создание таблицы сотрудников

  1. Новые таблицы
    - `employees`
      - `id` (uuid, первичный ключ)
      - `full_name` (text)
      - `position` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблицы `employees`
    - Добавление политики для чтения данных аутентифицированными пользователями
    - Добавление политики для обновления данных администраторами и менеджерами
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все пользователи могут читать данные сотрудников"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Администраторы и менеджеры могут обновлять данные сотрудников"
  ON employees
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'MANAGER'));

-- Вставка начальных данных
INSERT INTO employees (id, full_name, position, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Петров Александр Иванович', 'VET', true),
  ('00000000-0000-0000-0000-000000000002', 'Иванова Мария Сергеевна', 'INSEMINATOR', true),
  ('00000000-0000-0000-0000-000000000003', 'Сидорова Анна Петровна', 'CARETAKER', true),
  ('00000000-0000-0000-0000-000000000004', 'Козлов Дмитрий Николаевич', 'ZOOTECHNICIAN', true)
ON CONFLICT (id) DO NOTHING;