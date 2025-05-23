/*
  # Create groups table

  1. New Tables
    - `groups`
      - `id` (uuid, primary key)
      - `number` (text)
      - `description` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `groups` table
    - Add policies for data access
*/

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by all authenticated users"
  ON groups
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Groups can be modified by admins, managers and zootehnicians"
  ON groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'ZOOTECHNICIAN')
    )
  );

-- Начальные данные
INSERT INTO groups (number, description)
VALUES 
  ('1', 'Основное стадо'),
  ('2', 'Коровы в сухостое'),
  ('3', 'Молодые коровы');