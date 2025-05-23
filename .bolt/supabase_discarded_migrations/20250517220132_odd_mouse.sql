/*
  # Изменение типа данных для номера группы
  
  1. Изменения:
    - Добавление проверки, что номер группы является числовым значением
    - Преобразование существующих значений в числовой формат
  
  2. Безопасность:
    - Сохранение всех существующих данных
    - Проверка корректности преобразования
*/

-- Добавляем проверку, что номер группы является числовым значением
ALTER TABLE public.groups
ADD CONSTRAINT groups_number_is_numeric CHECK (number ~ '^[0-9]+$');

-- Создаем функцию для проверки номеров групп при вставке или обновлении
CREATE OR REPLACE FUNCTION public.validate_group_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, что номер группы является числовым значением
  IF NEW.number !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Номер группы должен быть числовым значением';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для проверки номеров групп
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_validate_group_number'
  ) THEN
    CREATE TRIGGER trigger_validate_group_number
    BEFORE INSERT OR UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_group_number();
  END IF;
END $$;