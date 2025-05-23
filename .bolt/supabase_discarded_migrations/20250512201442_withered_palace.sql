/*
  # Исправление политик RLS для таблиц groups и users

  1. Изменения политик безопасности
    - Корректируем политики для таблицы `groups`
    - Корректируем политики для таблицы `users`
    
  2. Безопасность
    - Обновляем политики RLS, чтобы аутентифицированные пользователи могли корректно добавлять новые записи
    - Обеспечиваем правильное применение политик для всех операций
*/

-- Сначала исправим политики для таблицы groups
DROP POLICY IF EXISTS "All authenticated users can do anything with groups" ON "public"."groups";

CREATE POLICY "All authenticated users can do anything with groups"
ON "public"."groups"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Теперь исправим политики для таблицы users
DROP POLICY IF EXISTS "All authenticated users can do anything with users" ON "public"."users";

CREATE POLICY "All authenticated users can do anything with users"
ON "public"."users"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Убедимся, что RLS включен для обеих таблиц
ALTER TABLE IF EXISTS "public"."groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."users" ENABLE ROW LEVEL SECURITY;