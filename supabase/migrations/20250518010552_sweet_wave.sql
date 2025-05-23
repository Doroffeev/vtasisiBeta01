/*
  # Добавление поля name в таблицу animals

  1. New Fields
    - Добавляет колонку `name` в таблицу `animals` если она отсутствует
    - Устанавливает значение по умолчанию равным полю `number` для всех существующих записей
    - Добавляет ограничение NOT NULL

  2. Changes
    - Обеспечивает соответствие схемы базы данных с интерфейсами в коде
*/

-- Проверяем существует ли колонка name в таблице animals
DO $$
BEGIN
  -- Проверяем существование таблицы animals
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'animals'
  ) THEN
    -- Добавляем колонку name если она не существует
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'animals' AND column_name = 'name'
    ) THEN
      -- Сначала добавляем колонку без ограничения, чтобы можно было обновить данные
      ALTER TABLE animals ADD COLUMN name text DEFAULT '';
      
      -- Обновляем существующие записи, устанавливая name = number
      UPDATE animals SET name = number WHERE name = '';
      
      -- Добавляем ограничение NOT NULL после обновления данных
      ALTER TABLE animals ALTER COLUMN name SET NOT NULL;
      
      -- Добавляем индекс для быстрого поиска по имени
      CREATE INDEX IF NOT EXISTS idx_animals_name ON animals(name);
    END IF;
  END IF;
END $$;