/*
  # Установка политик безопасности RLS без ограничений

  1. Изменения:
    - Удаление всех существующих политик для всех основных таблиц
    - Создание новых политик, разрешающих все операции для всех аутентифицированных пользователей
    - Применение подхода "любой пользователь имеет неограниченные права"

  2. Безопасность:
    - Отключение всех проверок ролей пользователей
    - Разрешение всех операций для всех аутентифицированных пользователей
*/

-- Удаляем все существующие политики для таблицы users
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can update users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can read all users data" ON public.users;
DROP POLICY IF EXISTS "Admins can perform all operations on users" ON public.users;
DROP POLICY IF EXISTS "All authenticated users can do anything with users" ON public.users;

-- Таблица employees
DROP POLICY IF EXISTS "Employees are viewable by all authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Employees can be viewed by all authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Admins and Managers can insert into employees table" ON public.employees;
DROP POLICY IF EXISTS "Employees can be updated by admins and managers" ON public.employees;
DROP POLICY IF EXISTS "Employees can be deleted by admins and managers" ON public.employees;
DROP POLICY IF EXISTS "Employees can be inserted by all authenticated users" ON public.employees;
DROP POLICY IF EXISTS "All authenticated users can do anything with employees" ON public.employees;

-- Таблица groups
DROP POLICY IF EXISTS "Groups are viewable by all authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Groups can be inserted by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be updated by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be deleted by admins, managers and zootechnicians" ON public.groups;
DROP POLICY IF EXISTS "Groups can be modified by admins, managers and zootehnicians" ON public.groups;
DROP POLICY IF EXISTS "All authenticated users can do anything with groups" ON public.groups;

-- Таблица nomenclature
DROP POLICY IF EXISTS "Nomenclature items are viewable by all authenticated users" ON public.nomenclature;
DROP POLICY IF EXISTS "Nomenclature items can be modified by admins, managers and vets" ON public.nomenclature;
DROP POLICY IF EXISTS "All authenticated users can do anything with nomenclature" ON public.nomenclature;

-- Таблица medications
DROP POLICY IF EXISTS "Medications are viewable by all authenticated users" ON public.medications;
DROP POLICY IF EXISTS "Medications can be modified by admins, managers and vets" ON public.medications;
DROP POLICY IF EXISTS "All authenticated users can do anything with medications" ON public.medications;

-- Таблица write_offs
DROP POLICY IF EXISTS "Write-offs are viewable by all authenticated users" ON public.write_offs;
DROP POLICY IF EXISTS "Write-offs can be modified by admins, managers and vets" ON public.write_offs;
DROP POLICY IF EXISTS "All authenticated users can do anything with write_offs" ON public.write_offs;

-- Таблица bulls
DROP POLICY IF EXISTS "Bulls are viewable by all authenticated users" ON public.bulls;
DROP POLICY IF EXISTS "Bulls can be modified by authorized users" ON public.bulls;
DROP POLICY IF EXISTS "Bulls can be modified by authenticated users" ON public.bulls;
DROP POLICY IF EXISTS "All authenticated users can do anything with bulls" ON public.bulls;

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

-- Таблица groups
CREATE POLICY "All authenticated users can do anything with groups"
  ON public.groups
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

-- Убедимся, что RLS включен для всех таблиц
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nomenclature ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.write_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bulls ENABLE ROW LEVEL SECURITY;