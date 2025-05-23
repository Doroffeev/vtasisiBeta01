/*
  # Исправление политик безопасности для таблицы employees
  
  1. Изменения
    - Удаление существующих конфликтующих политик
    - Создание новой политики, которая корректно разрешает добавление сотрудников
    - Настройка правильных проверок ролей пользователя
  
  2. Безопасность
    - Сохраняется безопасность таблицы employees
    - Разрешается добавление новых записей авторизованным пользователям
*/

-- Удаляем все существующие политики для таблицы employees, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Employees are viewable by all authenticated users" ON employees;
DROP POLICY IF EXISTS "Employees can be inserted by all authenticated users" ON employees;
DROP POLICY IF EXISTS "Employees can be updated by admins and managers" ON employees;
DROP POLICY IF EXISTS "Employees can be deleted by admins and managers" ON employees;
DROP POLICY IF EXISTS "Employees can be modified by admins and managers" ON employees;
DROP POLICY IF EXISTS "Авторизованные пользователи могут" ON employees;
DROP POLICY IF EXISTS "Все пользователи могут читать дан" ON employees;
DROP POLICY IF EXISTS "Администраторы и менеджеры могут" ON employees;

-- Создаем новые корректные политики
-- 1. Политика для чтения: все авторизованные пользователи могут читать данные сотрудников
CREATE POLICY "Employees are viewable by all authenticated users"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Политика для вставки: все авторизованные пользователи могут добавлять сотрудников
CREATE POLICY "Employees can be inserted by all authenticated users"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Политика для обновления: только администраторы и менеджеры могут обновлять данные сотрудников
CREATE POLICY "Employees can be updated by admins and managers"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER')
    )
  );

-- 4. Политика для удаления: только администраторы и менеджеры могут удалять сотрудников
CREATE POLICY "Employees can be deleted by admins and managers"
  ON employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER')
    )
  );