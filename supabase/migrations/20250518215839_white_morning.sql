/*
  # Add supplier field to medications table

  1. Changes
     - Add supplier column to medications table
     - This allows tracking the source of medications for reporting
  
  2. Security
     - No changes to security policies required
*/

-- Проверяем и добавляем колонку supplier в таблицу medications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medications' AND column_name = 'supplier'
  ) THEN
    ALTER TABLE medications ADD COLUMN supplier text;
  END IF;
END $$;