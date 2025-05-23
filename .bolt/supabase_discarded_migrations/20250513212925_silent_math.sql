/*
  # Создание таблицы для тестов стельности
  
  1. Новые таблицы
    - `pregnancy_tests` - таблица для записи тестов стельности
      - `id` (uuid, первичный ключ)
      - `date` (date, дата проведения теста)
      - `animal_id` (uuid, ссылка на животное)
      - `animal_number` (text, номер животного для сохранения в истории)
      - `result` (text, результат теста: 'positive' или 'negative')
      - `executor_id` (uuid, ссылка на исполнителя)
      - `comments` (text, комментарии к тесту)
      - `is_deleted` (boolean, признак удаления)
      - `deleted_at` (timestamptz, дата удаления)
      - `deleted_by` (uuid, кто удалил)
      - `deletion_reason` (text, причина удаления)
      - `created_at` (timestamptz, дата создания записи)
  
  2. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы для тестов стельности
CREATE TABLE IF NOT EXISTS public.pregnancy_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  animal_id uuid,
  animal_number text NOT NULL,
  result text NOT NULL CHECK (result IN ('positive', 'negative')),
  executor_id uuid REFERENCES public.users(id),
  comments text,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы тестов стельности
ALTER TABLE public.pregnancy_tests ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для тестов стельности
CREATE POLICY "All authenticated users can do anything with pregnancy_tests"
  ON public.pregnancy_tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Добавление индекса для улучшения производительности запросов по животным
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_animal_id ON public.pregnancy_tests(animal_id);

-- Добавление индекса по дате для сортировки
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_date ON public.pregnancy_tests(date);

-- Добавление индекса по результату для фильтрации
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_result ON public.pregnancy_tests(result);