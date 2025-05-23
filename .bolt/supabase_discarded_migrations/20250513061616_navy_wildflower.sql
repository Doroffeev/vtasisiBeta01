/*
  # Update calving_logs foreign key constraint

  1. Changes
     - Modify the foreign key constraint on calving_logs to allow NULL values for calving_id
     - This allows keeping logs of deleted calvings without foreign key violations
  
  2. Security
     - RLS policies remain unchanged
*/

-- Modify the foreign key constraint to allow NULL values
ALTER TABLE calving_logs 
DROP CONSTRAINT IF EXISTS calving_logs_calving_id_fkey;

ALTER TABLE calving_logs
ADD CONSTRAINT calving_logs_calving_id_fkey 
FOREIGN KEY (calving_id) 
REFERENCES calvings(id)
ON DELETE SET NULL;

-- Make calving_id column nullable if it's not already
ALTER TABLE calving_logs
ALTER COLUMN calving_id DROP NOT NULL;