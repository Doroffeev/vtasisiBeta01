-- Удаляем все существующие политики для таблицы users, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can read all users data" ON public.users;
DROP POLICY IF EXISTS "Admins can perform all operations on users" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Only admins can update users" ON public.users;
DROP POLICY IF EXISTS "Only admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Only admins can insert new users" ON public.users;

-- Создаем новые корректные политики

-- 1. Политика для чтения собственных данных
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- 2. Политика для чтения всех пользователей (для отображения списков)
CREATE POLICY "Users can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Политика для вставки новых пользователей (только для администраторов)
CREATE POLICY "Only admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

-- 4. Политика для обновления пользователей (только для администраторов)
CREATE POLICY "Only admins can update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

-- 5. Политика для удаления пользователей (только для администраторов)
CREATE POLICY "Only admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
    )
  );

-- Проверка наличия администратора и создание, если его нет
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'ADMIN') THEN
    INSERT INTO public.users (username, full_name, role, is_active)
    VALUES ('admin', 'Администратор', 'ADMIN', true);
  END IF;
END $$;