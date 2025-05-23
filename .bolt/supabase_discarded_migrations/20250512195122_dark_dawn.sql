/*
  # Исправление политик безопасности для таблицы пользователей

  1. Изменения:
    - Удаляются все существующие политики для таблицы users
    - Устанавливаются новые корректные политики
    - Создается явная политика для добавления новых пользователей
  
  2. Безопасность:
    - Обеспечивает правильные проверки ролей пользователей
    - Гарантирует, что только администраторы могут добавлять новых пользователей
*/

-- Удаляем все существующие политики для таблицы users, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read all users data" ON users;
DROP POLICY IF EXISTS "Admins can perform all operations on users" ON users;
DROP POLICY IF EXISTS "Only admins can insert new users" ON users;
DROP POLICY IF EXISTS "Пользователи могут читать свои данные" ON users;
DROP POLICY IF EXISTS "Администраторы могут обновлять данные пользователей" ON users;

-- Создаем новые корректные политики

-- 1. Политика для чтения собственных данных для всех пользователей
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

-- 3. Политика для вставки новых пользователей (только для администраторов)
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

-- 4. Политика для обновления пользователей (только для администраторов)
CREATE POLICY "Only admins can update users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- 5. Политика для удаления пользователей (только для администраторов)
CREATE POLICY "Only admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'ADMIN'
    )
  );

-- Проверяем наличие администратора в базе данных
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN') THEN
    -- Добавляем администратора, если его нет
    INSERT INTO users (username, full_name, role, is_active)
    VALUES ('admin', 'Администратор', 'ADMIN', true);
  END IF;
END $$;