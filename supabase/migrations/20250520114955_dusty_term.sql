/*
  # Create tables for reproduction cycle management
  
  1. Add conditions to operation steps
    - Add condition column to operation_steps table to specify when steps should be executed
      - ALWAYS (default): Step always executes
      - POSITIVE: Step executes only when the previous step had a positive result
      - NEGATIVE: Step executes only when the previous step had a negative result
  
  2. Add result tracking to scheduled operations
    - Add result column to scheduled_operations table to store positive/negative results
    - This allows the system to determine which conditional steps to execute next
  
  3. Create indexes for improved performance
*/

-- Add condition column to operation_steps table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operation_steps' AND column_name = 'condition'
  ) THEN
    ALTER TABLE operation_steps ADD COLUMN condition text CHECK (condition IN ('ALWAYS', 'POSITIVE', 'NEGATIVE')) DEFAULT 'ALWAYS';
  END IF;
END $$;

-- Add result column to scheduled_operations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scheduled_operations' AND column_name = 'result'
  ) THEN
    ALTER TABLE scheduled_operations ADD COLUMN result text CHECK (result IN ('POSITIVE', 'NEGATIVE'));
  END IF;
END $$;

-- Create or update indexes for improved performance
DO $$
BEGIN
  -- Index for assigned_plans by animal_id for quick lookup of plans by animal
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_assigned_plans_animal_id'
  ) THEN
    CREATE INDEX idx_assigned_plans_animal_id ON assigned_plans(animal_id);
  END IF;

  -- Index for scheduled_operations by animal_id for quick lookup of operations by animal
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_scheduled_operations_animal_id'
  ) THEN
    CREATE INDEX idx_scheduled_operations_animal_id ON scheduled_operations(animal_id);
  END IF;

  -- Index for scheduled_operations by operation_type for filtering
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_scheduled_operations_operation_type'
  ) THEN
    CREATE INDEX idx_scheduled_operations_operation_type ON scheduled_operations(operation_type);
  END IF;
  
  -- Composite index for filtering operations by animal and completion status
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_scheduled_operations_animal_completed'
  ) THEN
    CREATE INDEX idx_scheduled_operations_animal_completed ON scheduled_operations(animal_id, is_completed);
  END IF;
END $$;

-- Create function for propagating status changes based on pregnancy test results
CREATE OR REPLACE FUNCTION update_animal_status_on_pregnancy_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process operation completion events
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    -- Handle pregnancy test results
    IF NEW.operation_type = 'PREGNANCY_TEST' AND NEW.result IS NOT NULL THEN
      -- If positive, update animal status to 'Стел'
      IF NEW.result = 'POSITIVE' THEN
        UPDATE animals 
        SET 
          status = 'Стел',
          -- Calculate expected calving date (~285 days from insemination)
          next_calving_date = (
            SELECT (inseminations.date::date + INTERVAL '285 days')::date
            FROM inseminations
            WHERE animal_id = NEW.animal_id
            ORDER BY date DESC
            LIMIT 1
          )
        WHERE id = NEW.animal_id;
      -- If negative, update animal status to 'Ялов'
      ELSIF NEW.result = 'NEGATIVE' THEN
        UPDATE animals
        SET 
          status = 'Ялов',
          next_calving_date = NULL
        WHERE id = NEW.animal_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the function
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_update_animal_status_on_pregnancy_result ON scheduled_operations;
  
  CREATE TRIGGER trigger_update_animal_status_on_pregnancy_result
    AFTER UPDATE OF is_completed, result ON scheduled_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_animal_status_on_pregnancy_result();
END $$;

-- Initial test data for the reproduction cycle (optional)
DO $$
DECLARE
  template_id uuid;
  step_id uuid;
  group_id uuid;
BEGIN
  -- Skip if template already exists
  IF NOT EXISTS (
    SELECT 1 FROM operation_templates 
    WHERE name = 'Стандартный репродуктивный цикл'
  ) THEN
    -- Get a group ID for the dry period
    SELECT id INTO group_id FROM groups LIMIT 1;
    
    -- Create reproduction cycle template
    INSERT INTO operation_templates (
      name, 
      description, 
      is_active
    ) 
    VALUES (
      'Стандартный репродуктивный цикл',
      'Полный цикл от осеменения до отёла с последующим началом нового цикла',
      TRUE
    )
    RETURNING id INTO template_id;
    
    -- Create steps for the reproduction cycle
    
    -- Step 1: Insemination
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'INSEMINATION',
      'Первичное осеменение',
      0,
      'Проведение первичного осеменения',
      1,
      'ALWAYS'
    );
    
    -- Step 2: First pregnancy test
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'PREGNANCY_TEST',
      'Первый тест стельности',
      30,
      'Первая проверка стельности через УЗИ',
      2,
      'ALWAYS'
    )
    RETURNING id INTO step_id;
    
    -- Step 3: Second pregnancy test (only if first was positive)
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'PREGNANCY_TEST',
      'Повторный тест стельности',
      60,
      'Повторная проверка стельности',
      3,
      'POSITIVE'
    );
    
    -- Step 4: Move to dry period (only if pregnancy tests were positive)
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      change_group_id,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'GROUP_CHANGE',
      'Перевод на сухостой',
      150,
      'Перевод стельной коровы в группу сухостоя',
      group_id,
      4,
      'POSITIVE'
    );
    
    -- Step 5: Expected calving
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'CALVING',
      'Ожидаемый отёл',
      75,
      'Ожидаемая дата отёла',
      5,
      'POSITIVE'
    );
    
    -- Step 6: Start new cycle
    INSERT INTO operation_steps (
      template_id,
      operation_type,
      name,
      days_after_previous,
      description,
      sort_order,
      condition
    ) 
    VALUES (
      template_id,
      'INSEMINATION',
      'Начало нового цикла',
      60,
      'Повторное осеменение после отёла',
      6,
      'ALWAYS'
    );
    
    RAISE NOTICE 'Successfully created reproduction cycle template';
  ELSE
    RAISE NOTICE 'Reproduction cycle template already exists';
  END IF;
END $$;