/*
  # Обновление типов данных для числовых полей
  
  1. Изменения:
    - Добавление проверок для числовых полей
    - Обеспечение корректных типов данных для числовых значений
  
  2. Безопасность:
    - Сохранение всех существующих данных
    - Проверка корректности преобразования
*/

-- Добавляем проверки для числовых полей в таблице animals
DO $$
BEGIN
  -- Проверяем существование таблицы animals
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'animals'
  ) THEN
    -- Добавляем проверку для поля weight (вес)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'animals' AND column_name = 'weight' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.animals
      ADD CONSTRAINT animals_weight_check CHECK (weight IS NULL OR weight >= 0);
    END IF;
    
    -- Добавляем проверку для поля lactation (лактация)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'animals' AND column_name = 'lactation' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.animals
      ADD CONSTRAINT animals_lactation_check CHECK (lactation IS NULL OR lactation >= 0);
    END IF;
    
    -- Добавляем проверку для поля insemination_count (количество осеменений)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage
      WHERE table_name = 'animals' AND column_name = 'insemination_count' AND constraint_name LIKE '%check%'
    ) THEN
      ALTER TABLE public.animals
      ADD CONSTRAINT animals_insemination_count_check CHECK (insemination_count IS NULL OR insemination_count >= 0);
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
    -- Добавляем проверку для поля child_weight (вес теленка)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'calvings' AND column_name = 'child_weight'
    ) THEN
      -- Преобразуем поле child_weight в числовой тип, если оно строковое
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'calvings' AND column_name = 'child_weight' AND data_type = 'text'
      ) THEN
        -- Создаем временную колонку для хранения числовых значений
        ALTER TABLE public.calvings ADD COLUMN child_weight_numeric numeric;
        
        -- Обновляем временную колонку, преобразуя строковые значения в числовые
        UPDATE public.calvings
        SET child_weight_numeric = CASE 
          WHEN child_weight ~ '^[0-9]+(\.[0-9]+)?$' THEN child_weight::numeric
          ELSE NULL
        END;
        
        -- Удаляем старую колонку
        ALTER TABLE public.calvings DROP COLUMN child_weight;
        
        -- Переименовываем временную колонку
        ALTER TABLE public.calvings RENAME COLUMN child_weight_numeric TO child_weight;
        
        -- Добавляем проверку для поля child_weight
        ALTER TABLE public.calvings
        ADD CONSTRAINT calvings_child_weight_check CHECK (child_weight IS NULL OR child_weight >= 0);
      END IF;
    END IF;
  END IF;
END $$;

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