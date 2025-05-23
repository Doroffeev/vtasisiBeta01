/*
  # Удаление поля description из таблицы groups

  1. Изменения
    - Удаление колонки description из таблицы groups
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'groups' AND column_name = 'description'
  ) THEN
    ALTER TABLE groups DROP COLUMN IF EXISTS description;
  END IF;
END $$;