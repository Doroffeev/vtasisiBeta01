/*
  # Create employees table

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `position` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `employees` table
    - Add policies for data access
*/

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL CHECK (position IN ('VET', 'INSEMINATOR', 'CARETAKER', 'ZOOTECHNICIAN')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees are viewable by all authenticated users"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can be modified by admins and managers"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER')
    )
  );

-- Начальные данные
INSERT INTO employees (full_name, position, is_active)
VALUES 
  ('Петров Александр Иванович', 'VET', true),
  ('Иванова Мария Сергеевна', 'INSEMINATOR', true),
  ('Сидорова Анна Петровна', 'CARETAKER', true),
  ('Козлов Дмитрий Николаевич', 'ZOOTECHNICIAN', true);