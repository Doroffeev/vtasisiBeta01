/*
  # Create nomenclature table

  1. New Tables
    - `nomenclature`
      - `id` (uuid, primary key)
      - `code` (text)
      - `name` (text)
      - `unit` (text)
      - `category` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `nomenclature` table
    - Add policies for data access
*/

CREATE TABLE IF NOT EXISTS nomenclature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('шт', 'мл', 'гр')),
  category text NOT NULL CHECK (category IN ('АНТИБИОТИК', 'ВАКЦИНА', 'ВИТАМИН', 'ДРУГОЕ')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nomenclature items are viewable by all authenticated users"
  ON nomenclature
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Nomenclature items can be modified by admins, managers and vets"
  ON nomenclature
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (
        users.role = 'ADMIN' OR 
        users.role = 'MANAGER' OR 
        users.role = 'VET'
      )
    )
  );

-- Начальные данные
INSERT INTO nomenclature (code, name, unit, category)
VALUES 
  ('АНТ-001', 'Пенициллин', 'мл', 'АНТИБИОТИК'),
  ('ВАК-001', 'Вакцина против ящура', 'мл', 'ВАКЦИНА');