/*
  # Исправление политик безопасности для таблицы groups

  1. Изменения:
    - Удаляются существующие конфликтующие политики
    - Добавляются корректные политики с правильной проверкой ролей
    - Создается явная политика для добавления новых групп
  
  2. Безопасность:
    - Обеспечивает правильные проверки ролей пользователей
    - Гарантирует, что пользователи с соответствующими ролями имеют доступ
*/

-- Удаляем все существующие политики для таблицы groups, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Groups are viewable by all authenticated users" ON public.groups;
DROP POLICY IF EXISTS "Groups can be modified by admins, managers and zootehnicians" ON public.groups;
DROP POLICY IF EXISTS "Администраторы и менеджеры могут " ON public.groups;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON public.groups;

-- Создаем новые корректные политики

-- 1. Политика для чтения групп (для всех авторизованных пользователей)
CREATE POLICY "Groups are viewable by all authenticated users"
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Политика для вставки новых групп (для администраторов, менеджеров и зоотехников)
CREATE POLICY "Groups can be inserted by admins, managers and zootechnicians"
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'ZOOTECHNICIAN')
    )
    OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER', 'ZOOTECHNICIAN')
  );

-- 3. Политика для обновления групп (для администраторов, менеджеров и зоотехников)
CREATE POLICY "Groups can be updated by admins, managers and zootechnicians"
  ON public.groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'ZOOTECHNICIAN')
    )
    OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER', 'ZOOTECHNICIAN')
  );

-- 4. Политика для удаления групп (для администраторов, менеджеров и зоотехников)
CREATE POLICY "Groups can be deleted by admins, managers and zootechnicians"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() 
      AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'ZOOTECHNICIAN')
    )
    OR
    (auth.jwt() ->> 'role') IN ('ADMIN', 'MANAGER', 'ZOOTECHNICIAN')
  );