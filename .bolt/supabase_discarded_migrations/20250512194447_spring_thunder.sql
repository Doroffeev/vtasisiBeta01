/*
  # Исправление политик безопасности для добавления пользователей

  1. Изменения
    - Удаляем существующие конфликтующие политики для таблицы users
    - Добавляем правильные политики с проверкой роли пользователя
    - Для пользователей с ролью ADMIN разрешаем все операции
    - Добавляем политику для чтения своих данных для всех пользователей
    - Исправляем проверки ролей
*/

-- Удаляем существующие политики для пользователей
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can perform all operations on users" ON users;
DROP POLICY IF EXISTS "Пользователи могут читать свои да" ON users;
DROP POLICY IF EXISTS "Администраторы могут обновлять да" ON users;

-- Создаем правильные политики
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read all users data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Создаем триггерную функцию для установки роли пользователя в JWT
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Если пользователь найден в таблице users, устанавливаем его роль в JWT
  IF EXISTS (SELECT 1 FROM users WHERE username = NEW.email) THEN
    NEW.raw_app_meta_data := jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      (SELECT to_jsonb(role) FROM users WHERE username = NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем и создаем триггер, если его еще нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_user_role_on_signup'
  ) THEN
    CREATE TRIGGER set_user_role_on_signup
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Удаляем существующие политики для сотрудников
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