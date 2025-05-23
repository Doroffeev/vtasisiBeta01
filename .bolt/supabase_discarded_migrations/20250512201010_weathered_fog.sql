-- Удаляем все существующие политики для таблицы groups, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Groups are viewable by all authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Groups can be inserted by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be updated by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be deleted by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be modified by admins, managers and zootehnicians" ON public.groups;
DROP POLICY IF EXISTS "Администраторы и менеджеры могут " ON public.groups;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.groups;

-- Создаем новую политику, разрешающую все операции для всех аутентифицированных пользователей
CREATE POLICY "All authenticated users can do anything with groups"
  ON public.groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Удаляем все существующие политики для основных таблиц, чтобы создать политики без ограничений
-- Таблица users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can update users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;

-- Таблица employees
DROP POLICY IF EXISTS "Employees are viewable by all authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Employees can be viewed by all authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Admins and Managers can insert into employees table" ON public.employees;
DROP POLICY IF EXISTS "Employees can be updated by admins and managers" ON public.employees;
DROP POLICY IF EXISTS "Employees can be deleted by admins and managers" ON public.employees;

-- Таблица nomenclature
DROP POLICY IF EXISTS "Nomenclature items are viewable by all authenticated users" ON public.nomenclature;
DROP POLICY IF EXISTS "Nomenclature items can be modified by admins, managers and vets" ON public.nomenclature;
DROP POLICY IF EXISTS "Авторизованные пользователи могу" ON public.nomenclature;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.nomenclature;

-- Таблица medications
DROP POLICY IF EXISTS "Medications are viewable by all authenticated users" ON public.medications;
DROP POLICY IF EXISTS "Medications can be modified by admins, managers and vets" ON public.medications;
DROP POLICY IF EXISTS "Авторизованные пользователи могу" ON public.medications;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.medications;

-- Таблица write_offs
DROP POLICY IF EXISTS "Write-offs are viewable by all authenticated users" ON public.write_offs;
DROP POLICY IF EXISTS "Write-offs can be modified by admins, managers and vets" ON public.write_offs;
DROP POLICY IF EXISTS "Авторизованные пользователи могу" ON public.write_offs;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.write_offs;

-- Таблица bulls
DROP POLICY IF EXISTS "Bulls are viewable by all authenticated users" ON public.bulls;
DROP POLICY IF EXISTS "Bulls can be modified by authorized users" ON public.bulls;
DROP POLICY IF EXISTS "Авторизованные пользователи могу" ON public.bulls;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.bulls;
DROP POLICY IF EXISTS "Bulls can be modified by authenticated users" ON public.bulls;

-- Создаем новые политики, разрешающие все операции для всех аутентифицированных пользователей

-- Таблица users
CREATE POLICY "All authenticated users can do anything with users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Таблица employees
CREATE POLICY "All authenticated users can do anything with employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Таблица nomenclature
CREATE POLICY "All authenticated users can do anything with nomenclature"
  ON public.nomenclature
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Таблица medications
CREATE POLICY "All authenticated users can do anything with medications"
  ON public.medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Таблица write_offs
CREATE POLICY "All authenticated users can do anything with write_offs"
  ON public.write_offs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Таблица bulls
CREATE POLICY "All authenticated users can do anything with bulls"
  ON public.bulls
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);