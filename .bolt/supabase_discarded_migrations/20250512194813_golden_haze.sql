-- Исправление политик безопасности для таблицы users
-- Удаляем существующие политики для таблицы users, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read all users data" ON users;
DROP POLICY IF EXISTS "Admins can perform all operations on users" ON users;
DROP POLICY IF EXISTS "Пользователи могут читать свои данные" ON users;
DROP POLICY IF EXISTS "Администраторы могут обновлять данные пользователей" ON users;

-- Создаем новые правильные политики
-- 1. Политика для чтения собственных данных
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Политика для чтения всех пользователей (для отображения списка)
CREATE POLICY "Users can read all users data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Политика для всех операций для администраторов
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

-- Явно создаем политику для INSERT, ограничивая её только администраторами
CREATE POLICY "Only admins can insert new users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Удаляем существующие политики для таблицы employees, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Admins and Managers can insert into employees table" ON employees;
DROP POLICY IF EXISTS "Employees can be inserted by all authenticated users" ON employees;

-- Создаем политику, разрешающую только администраторам и менеджерам добавлять сотрудников
CREATE POLICY "Admins and Managers can insert into employees table"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER')
    )
  );