/*
  # Add conditional outcomes to operation steps

  1. New Fields
    - Added `has_conditions` boolean column to operation_steps table
    - Added `positive_outcome` JSONB column to operation_steps table
    - Added `negative_outcome` JSONB column to operation_steps table
    - Added `result_type` column to scheduled_operations table
  
  2. Changes
    - Allows for branching logic in operation templates
    - Enables different actions based on positive/negative results
    - Supports conditional termination of plans

  3. Use cases
    - Pregnancy tests with different paths for positive/negative results
    - Health checks with conditional follow-ups
    - Any operation that can succeed or fail with different consequences
*/

-- Add conditional fields to operation_steps table
DO $$
BEGIN
  -- Add has_conditions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_steps' AND column_name = 'has_conditions'
  ) THEN
    ALTER TABLE operation_steps ADD COLUMN has_conditions boolean DEFAULT false;
  END IF;

  -- Add positive_outcome column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_steps' AND column_name = 'positive_outcome'
  ) THEN
    ALTER TABLE operation_steps ADD COLUMN positive_outcome jsonb;
  END IF;

  -- Add negative_outcome column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_steps' AND column_name = 'negative_outcome'
  ) THEN
    ALTER TABLE operation_steps ADD COLUMN negative_outcome jsonb;
  END IF;

  -- Add result_type column to scheduled_operations if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_operations' AND column_name = 'result_type'
  ) THEN
    ALTER TABLE scheduled_operations ADD COLUMN result_type text CHECK (result_type IN ('positive', 'negative'));
  END IF;
END $$;

-- Update existing pregnancy test steps to have conditional outcomes
WITH pregnancy_tests AS (
  SELECT id 
  FROM operation_steps 
  WHERE operation_type = 'PREGNANCY_TEST'
)
UPDATE operation_steps
SET 
  has_conditions = true,
  positive_outcome = '{"changeStatus": "Стел", "terminatePlan": false}'::jsonb,
  negative_outcome = '{"changeStatus": "Ялов", "terminatePlan": true}'::jsonb
WHERE id IN (SELECT id FROM pregnancy_tests);

-- Create comment explaining the use of these fields
COMMENT ON COLUMN operation_steps.has_conditions IS 'Indicates whether this step has conditional outcomes based on positive/negative results';
COMMENT ON COLUMN operation_steps.positive_outcome IS 'Actions to take when the operation result is positive (JSON with changeStatus, changeGroupId, terminatePlan fields)';
COMMENT ON COLUMN operation_steps.negative_outcome IS 'Actions to take when the operation result is negative (JSON with changeStatus, changeGroupId, terminatePlan fields)';
COMMENT ON COLUMN scheduled_operations.result_type IS 'The type of result for completed operations: positive or negative';