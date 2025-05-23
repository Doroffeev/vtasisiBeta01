/*
  # Добавление дополнительных полей в таблицу shipments
  
  1. Изменения:
    - Добавление колонок для хранения номера животного и имени покупателя напрямую в таблице
    - Добавление колонки для хранения имени пользователя, который произвел отгрузку
    
  2. Преимущества:
    - Уменьшает зависимость от связей между таблицами
    - Упрощает запросы данных
    - Делает систему более устойчивой к ошибкам
*/

-- Добавляем колонку для хранения номера животного
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'shipments' 
      AND column_name = 'animal_number'
  ) THEN
    ALTER TABLE public.shipments 
    ADD COLUMN animal_number text;
  END IF;
END $$;

-- Добавляем колонку для хранения имени покупателя
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'shipments' 
      AND column_name = 'buyer_name'
  ) THEN
    ALTER TABLE public.shipments 
    ADD COLUMN buyer_name text;
  END IF;
END $$;

-- Добавляем колонку для хранения имени отпускающего
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'shipments' 
      AND column_name = 'releaser_name'
  ) THEN
    ALTER TABLE public.shipments 
    ADD COLUMN releaser_name text;
  END IF;
END $$;