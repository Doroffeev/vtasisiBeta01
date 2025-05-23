/*
  # Medications Schema Update
  
  1. New Tables
    - nomenclature: Stores medication nomenclature items
    - medications: Stores medication inventory
    - write_offs: Stores medication write-offs
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    
  3. Indexes
    - Add indexes for frequently queried columns
*/

-- Создание таблицы номенклатуры
CREATE TABLE IF NOT EXISTS nomenclature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('шт', 'мл', 'гр')),
  category text NOT NULL CHECK (category IN ('АНТИБИОТИК', 'ВАКЦИНА', 'ВИТАМИН', 'ДРУГОЕ')),
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы препаратов
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id uuid REFERENCES nomenclature(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  invoice_number text NOT NULL,
  remaining_quantity integer NOT NULL,
  receipt_date date NOT NULL,
  expiry_date date NOT NULL,
  batch_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Создание таблицы списаний
CREATE TABLE IF NOT EXISTS write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  medication_id uuid REFERENCES medications(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  executor_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;

-- Удаление существующих политик перед созданием новых
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Nomenclature items are viewable by all authenticated users" ON nomenclature;
  DROP POLICY IF EXISTS "Nomenclature items can be modified by admins, managers and vets" ON nomenclature;
  DROP POLICY IF EXISTS "All authenticated users can do anything with medications" ON medications;
  DROP POLICY IF EXISTS "All authenticated users can do anything with write_offs" ON write_offs;
END $$;

-- Политики доступа для номенклатуры
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
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'VET')
    )
  );

-- Политики доступа для препаратов
CREATE POLICY "All authenticated users can do anything with medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (true);

-- Политики доступа для списаний
CREATE POLICY "All authenticated users can do anything with write_offs"
  ON write_offs
  FOR ALL
  TO authenticated
  USING (true);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_medications_nomenclature_id ON medications(nomenclature_id);
CREATE INDEX IF NOT EXISTS idx_medications_expiry_date ON medications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_write_offs_medication_id ON write_offs(medication_id);
CREATE INDEX IF NOT EXISTS idx_write_offs_date ON write_offs(date);