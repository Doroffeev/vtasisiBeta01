/*
  # Включение RLS и настройка политик безопасности

  1. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик безопасности для аутентифицированных пользователей
*/

-- Включаем RLS для таблицы animals и добавляем политику
ALTER TABLE IF EXISTS animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with animals" 
  ON animals FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы groups и добавляем политику
ALTER TABLE IF EXISTS groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with groups" 
  ON groups FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы movements и добавляем политику
ALTER TABLE IF EXISTS movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with movements" 
  ON movements FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы movement_animals и добавляем политику
ALTER TABLE IF EXISTS movement_animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with movement_animals" 
  ON movement_animals FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы nomenclature и добавляем политику
ALTER TABLE IF EXISTS nomenclature ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with nomenclature" 
  ON nomenclature FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы medications и добавляем политику
ALTER TABLE IF EXISTS medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with medications" 
  ON medications FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы write_offs и добавляем политику
ALTER TABLE IF EXISTS write_offs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with write_offs" 
  ON write_offs FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы bulls и добавляем политику
ALTER TABLE IF EXISTS bulls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with bulls" 
  ON bulls FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы inseminations и добавляем политику
ALTER TABLE IF EXISTS inseminations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with inseminations" 
  ON inseminations FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы insemination_logs и добавляем политику
ALTER TABLE IF EXISTS insemination_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with insemination_logs" 
  ON insemination_logs FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы calvings и добавляем политику
ALTER TABLE IF EXISTS calvings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with calvings" 
  ON calvings FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы calving_logs и добавляем политику
ALTER TABLE IF EXISTS calving_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with calving_logs" 
  ON calving_logs FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы buyers и добавляем политику
ALTER TABLE IF EXISTS buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with buyers" 
  ON buyers FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы shipments и добавляем политику
ALTER TABLE IF EXISTS shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with shipments" 
  ON shipments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы shipment_animals и добавляем политику
ALTER TABLE IF EXISTS shipment_animals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with shipment_animals" 
  ON shipment_animals FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы shipment_logs и добавляем политику
ALTER TABLE IF EXISTS shipment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with shipment_logs" 
  ON shipment_logs FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы users и добавляем политику
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with users" 
  ON users FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы employees и добавляем политику
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with employees" 
  ON employees FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы action_logs и добавляем политику
ALTER TABLE IF EXISTS action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with action_logs" 
  ON action_logs FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы pregnancy_tests и добавляем политику
ALTER TABLE IF EXISTS pregnancy_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with pregnancy_tests" 
  ON pregnancy_tests FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы vet_operations и добавляем политику
ALTER TABLE IF EXISTS vet_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with vet_operations" 
  ON vet_operations FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы medication_usages и добавляем политику
ALTER TABLE IF EXISTS medication_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with medication_usages" 
  ON medication_usages FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы operation_comments и добавляем политику
ALTER TABLE IF EXISTS operation_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with operation_comments" 
  ON operation_comments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы treatment_schemes и добавляем политику
ALTER TABLE IF EXISTS treatment_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with treatment_schemes" 
  ON treatment_schemes FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы treatment_steps и добавляем политику
ALTER TABLE IF EXISTS treatment_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with treatment_steps" 
  ON treatment_steps FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы treatment_step_medications и добавляем политику
ALTER TABLE IF EXISTS treatment_step_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with treatment_step_med" 
  ON treatment_step_medications FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы active_treatments и добавляем политику
ALTER TABLE IF EXISTS active_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with active_treatments" 
  ON active_treatments FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы completed_steps и добавляем политику
ALTER TABLE IF EXISTS completed_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with completed_steps" 
  ON completed_steps FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Включаем RLS для таблицы missed_steps и добавляем политику
ALTER TABLE IF EXISTS missed_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can do anything with missed_steps" 
  ON missed_steps FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);