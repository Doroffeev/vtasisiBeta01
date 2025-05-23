/*
  # Create medications table

  1. New Tables
    - `medications`
      - `id` (uuid, primary key)
      - `nomenclature_id` (uuid, references nomenclature)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `invoice_number` (text)
      - `remaining_quantity` (integer)
      - `receipt_date` (date)
      - `expiry_date` (date)
      - `batch_number` (text)
      - `created_at` (timestamp)
    
    - `write_offs`
      - `id` (uuid, primary key)
      - `date` (date)
      - `medication_id` (uuid, references medications)
      - `quantity` (integer)
      - `reason` (text)
      - `executor_id` (uuid, references employees)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on tables
    - Add policies for data access
*/

CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id uuid REFERENCES nomenclature(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL,
  invoice_number text NOT NULL,
  remaining_quantity integer NOT NULL,
  receipt_date date NOT NULL,
  expiry_date date NOT NULL,
  batch_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  medication_id uuid REFERENCES medications(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  executor_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для medications
CREATE POLICY "Medications are viewable by all authenticated users"
  ON medications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Medications can be modified by admins, managers and vets"
  ON medications
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

-- Политики доступа для write_offs
CREATE POLICY "Write-offs are viewable by all authenticated users"
  ON write_offs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Write-offs can be modified by admins, managers and vets"
  ON write_offs
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
INSERT INTO medications (nomenclature_id, quantity, unit_price, invoice_number, remaining_quantity, receipt_date, expiry_date, batch_number)
VALUES 
  ((SELECT id FROM nomenclature WHERE code = 'АНТ-001'), 1000, 150, 'INV-001', 850, '2024-03-01', '2025-03-01', 'BATCH-001'),
  ((SELECT id FROM nomenclature WHERE code = 'ВАК-001'), 50, 300, 'INV-002', 42, '2024-03-15', '2025-03-15', 'BATCH-002');