/*
# Создание основной схемы базы данных

1. Таблицы
   - `users` - таблица пользователей системы
   - Включает предустановленные учетные записи admin и manager

2. Безопасность
   - Включена защита на уровне строк (RLS)
   - Добавлены политики доступа для аутентифицированных пользователей
*/

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Включение RLS для таблицы пользователей
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика для чтения данных аутентифицированными пользователями
CREATE POLICY "Пользователи могут видеть все записи" 
  ON public.users 
  FOR SELECT 
  USING (true);

-- Политика для создания/редактирования/удаления только для администраторов
CREATE POLICY "Только администраторы могут изменять пользователей" 
  ON public.users 
  FOR ALL 
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Создание начальных пользователей
INSERT INTO public.users (username, password, name, role)
VALUES 
  ('admin', 'admin', 'Администратор системы', 'admin'),
  ('manager', 'manager', 'Руководитель', 'manager')
ON CONFLICT (username) 
DO NOTHING;

-- Индекс для ускорения поиска по имени пользователя
CREATE INDEX IF NOT EXISTS users_username_idx ON public.users (username);