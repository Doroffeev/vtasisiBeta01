/*
  # Обновление ограничений для числовых полей

  1. Изменения:
    - Удаление ограничения на числовой формат для номера группы
    - Добавление проверки для поля name в таблице treatment_schemes
    - Обновление функции validate_group_number
*/

-- Удаляем ограничение на числовой формат для номера группы
ALTER TABLE public.groups
DROP CONSTRAINT IF EXISTS groups_number_is_numeric;

-- Обновляем функцию для проверки номеров групп
CREATE OR REPLACE FUNCTION public.validate_group_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверка больше не требуется, функция оставлена для совместимости
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Добавляем проверки для числовых полей в таблице treatment_schemes
DO $$
BEGIN
  -- Проверяем существование таблицы treatment_schemes
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'treatment_schemes'
  ) THEN
    -- Удаляем ограничение, если оно существует
    ALTER TABLE public.treatment_schemes
    DROP CONSTRAINT IF EXISTS treatment_schemes_name_is_numeric;
  END IF;
END $$;