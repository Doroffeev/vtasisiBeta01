/*
  # Add name field to animals table

  1. Changes
     - Add name field to animals table if it doesn't exist
     - Update existing animals to set name = number if name is empty
  
  2. Rationale
     - The name field is required by the application
     - This ensures existing records remain valid after adding the constraint
*/

-- Проверяем существует ли колонка name в таблице animals
DO $$
BEGIN
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
  END IF;
END $$;