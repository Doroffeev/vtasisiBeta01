/*
  # Create users table

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `full_name` (text)
      - `role` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

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

-- Начальные данные
INSERT INTO users (id, username, full_name, role, is_active)
VALUES 
  (gen_random_uuid(), 'admin', 'Администратор', 'ADMIN', true),
  (gen_random_uuid(), 'manager', 'Руководитель', 'MANAGER', true);