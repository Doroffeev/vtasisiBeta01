-- Добавляем проверки для числовых полей в таблице bulls
DO $$
BEGIN
  -- Проверяем существование таблицы bulls
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'bulls'
  ) THEN
    -- Добавляем проверку для поля price (цена)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'bulls' AND column_name = 'price' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.bulls
      ADD CONSTRAINT bulls_price_check CHECK (price >= 0);
    END IF;
    
    -- Добавляем проверку для поля remaining_doses (остаток доз)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'bulls' AND column_name = 'remaining_doses' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.bulls
      ADD CONSTRAINT bulls_remaining_doses_check CHECK (remaining_doses >= 0);
    END IF;
  END IF;
END $$;

-- Добавляем проверки для числовых полей в таблице medications
DO $$
BEGIN
  -- Проверяем существование таблицы medications
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'medications'
  ) THEN
    -- Добавляем проверку для поля unit_price (цена за единицу)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'medications' AND column_name = 'unit_price' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.medications
      ADD CONSTRAINT medications_unit_price_check CHECK (unit_price >= 0);
    END IF;
  END IF;
END $$;

-- Добавляем проверки для числовых полей в таблице calvings
DO $$
BEGIN
  -- Проверяем существование таблицы calvings
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'calvings'
  ) THEN
    -- Проверяем существование колонки child_weight перед добавлением ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'child_weight'
    ) THEN
      -- Проверяем тип данных колонки child_weight
      IF (
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'child_weight'
      ) = 'text' THEN
        -- Добавляем проверку для текстового поля child_weight
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE table_schema = 'public' AND table_name = 'calvings' AND column_name = 'child_weight' AND constraint_name LIKE '%check%'
        ) THEN
          -- Добавляем проверку, что текстовое значение может быть преобразовано в число и >= 0
          ALTER TABLE public.calvings
          ADD CONSTRAINT calvings_child_weight_check 
          CHECK (
            child_weight IS NULL OR 
            child_weight = '' OR 
            (child_weight ~ '^[0-9]+(\.[0-9]+)?$' AND child_weight::numeric >= 0)
          );
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Добавляем проверки для числовых полей в таблице treatment_schemes
DO $$
BEGIN
  -- Проверяем существование таблицы treatment_schemes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'treatment_schemes'
  ) THEN
    -- Проверяем существование колонки name перед изменением типа
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'treatment_schemes' AND column_name = 'name'
    ) THEN
      -- Проверяем, что колонка name имеет тип text
      IF (
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'treatment_schemes' AND column_name = 'name'
      ) = 'text' THEN
        -- Добавляем проверку, что значение name является числовым
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE table_schema = 'public' AND table_name = 'treatment_schemes' AND column_name = 'name' AND constraint_name LIKE '%check%'
        ) THEN
          -- Добавляем проверку, что текстовое значение может быть преобразовано в число
          ALTER TABLE public.treatment_schemes
          ADD CONSTRAINT treatment_schemes_name_is_numeric 
          CHECK (name ~ '^[0-9]+$');
        END IF;
      END IF;
    END IF;
  END IF;
END $$;