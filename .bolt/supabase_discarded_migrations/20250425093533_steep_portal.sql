/*
  # Создание таблицы ветеринарных препаратов

  1. Новые таблицы
    - `medications`
      - `id` (uuid, первичный ключ)
      - `nomenclature_id` (uuid, внешний ключ)
      - `quantity` (numeric)
      - `unit_price` (numeric)
      - `invoice_number` (text)
      - `remaining_quantity` (numeric)
      - `receipt_date` (date)
      - `expiry_date` (date)
      - `batch_number` (text)
      - `created_at` (timestamp)
    - `write_offs`
      - `id` (uuid, первичный ключ)
      - `date` (date)
      - `medication_id` (uuid, внешний ключ)
      - `quantity` (numeric)
      - `reason` (text)
      - `executor_id` (uuid, внешний ключ)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблиц `medications` и `write_offs`
    - Добавление политик для чтения и обновления данных
*/

CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id uuid REFERENCES nomenclature(id),
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  invoice_number text,
  remaining_quantity numeric NOT NULL,
  receipt_date date NOT NULL,
  expiry_date date NOT NULL,
  batch_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  medication_id uuid REFERENCES medications(id),
  quantity numeric NOT NULL,
  reason text NOT NULL,
  executor_id uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE write_offs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для medications
CREATE POLICY "Все пользователи могут читать данные препаратов"
  ON medications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Авторизованные пользователи могут обновлять данные препаратов"
  ON medications
  FOR ALL
  TO authenticated
  USING (true);

-- Политики доступа для write_offs
CREATE POLICY "Все пользователи могут читать данные списаний"
  ON write_offs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Авторизованные пользователи могут обновлять данные списаний"
  ON write_offs
  FOR ALL
  TO authenticated
  USING (true);

-- Вставка начальных данных
INSERT INTO medications (id, nomenclature_id, quantity, unit_price, invoice_number, remaining_quantity, receipt_date, expiry_date, batch_number)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 1000, 150, 'INV-001', 850, '2024-03-01', '2025-03-01', 'BATCH-001'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 50, 300, 'INV-002', 42, '2024-03-15', '2025-03-15', 'BATCH-002')
ON CONFLICT (id) DO NOTHING;