/*
  # Добавление колонки name к таблице animals

  1. Изменения
     - Добавляем колонку `name` к таблице `animals` если она не существует
     - Устанавливаем значение по умолчанию для новых записей
     - Обновляем все существующие записи, устанавливая name = number
*/

-- Проверяем существует ли колонка name в таблице animals
DO $$
BEGIN
  -- Добавляем колонку name если она не существует
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'animals' AND column_name = 'name'
  ) THEN
    -- Добавляем колонку с ограничением NOT NULL и значением по умолчанию ''
    ALTER TABLE animals ADD COLUMN name text NOT NULL DEFAULT '';
    
    -- Обновляем существующие записи, устанавливая name = number
    UPDATE animals SET name = number WHERE name = '';
  END IF;
END $$;