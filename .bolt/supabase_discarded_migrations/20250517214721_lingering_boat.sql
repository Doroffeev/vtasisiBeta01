/*
  # Создание таблицы animals и настройка триггеров для синхронизации данных
  
  1. Новые таблицы
    - `animals` - таблица для хранения информации о животных
  
  2. Триггеры
    - Триггеры для синхронизации данных между модулями
    - Триггеры для автоматического обновления статусов
  
  3. Безопасность
    - Включение RLS для таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы animals, если она не существует
CREATE TABLE IF NOT EXISTS public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  group_id uuid REFERENCES public.groups(id),
  status text NOT NULL,
  birth_date date,
  gender text CHECK (gender IN ('male', 'female')),
  mother_id uuid,
  last_calving_date date,
  last_insemination_date date,
  insemination_count integer,
  is_under_treatment boolean DEFAULT false,
  has_mastitis boolean DEFAULT false,
  mastitis_start_date date,
  treatment_end_date timestamptz,
  treatment_end_executor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  next_calving_date date,
  lactation text,
  responder text,
  weight text,
  days_in_milk text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы animals
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- Создание политики безопасности для animals
CREATE POLICY "All authenticated users can do anything with animals"
  ON public.animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Проверяем существование таблицы inseminations перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inseminations'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'inseminations_animal_id_fkey' 
      AND table_name = 'inseminations'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.inseminations DROP CONSTRAINT inseminations_animal_id_fkey;
    END IF;
  END IF;
END $$;

-- Проверяем существование таблицы calvings перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'calvings'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'calvings_mother_id_fkey' 
      AND table_name = 'calvings'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.calvings DROP CONSTRAINT calvings_mother_id_fkey;
    END IF;
  END IF;
END $$;

-- Проверяем существование таблицы vet_operations перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vet_operations'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'vet_operations_animal_id_fkey' 
      AND table_name = 'vet_operations'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.vet_operations DROP CONSTRAINT vet_operations_animal_id_fkey;
    END IF;
  END IF;
END $$;

-- Проверяем существование таблицы active_treatments перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'active_treatments'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'active_treatments_animal_id_fkey' 
      AND table_name = 'active_treatments'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.active_treatments DROP CONSTRAINT active_treatments_animal_id_fkey;
    END IF;
  END IF;
END $$;

-- Проверяем существование таблицы pregnancy_tests перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pregnancy_tests'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'pregnancy_tests_animal_id_fkey' 
      AND table_name = 'pregnancy_tests'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.pregnancy_tests DROP CONSTRAINT pregnancy_tests_animal_id_fkey;
    END IF;
  END IF;
END $$;

-- Проверяем существование таблицы movement_animals перед изменением ограничений
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'movement_animals'
  ) THEN
    -- Проверяем существование ограничения
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'movement_animals_animal_id_fkey' 
      AND table_name = 'movement_animals'
    ) THEN
      -- Удаляем существующее ограничение
      ALTER TABLE public.movement_animals DROP CONSTRAINT movement_animals_animal_id_fkey;
    END IF;
  END IF;
END $$;

-- Создание функции для синхронизации данных при изменении группы животного
CREATE OR REPLACE FUNCTION public.sync_animal_group_changes()
RETURNS TRIGGER AS $$
DECLARE
  movement_id uuid;
BEGIN
  -- Проверяем, что обе группы (старая и новая) не NULL
  IF OLD.group_id IS NOT NULL AND NEW.group_id IS NOT NULL AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    -- Вставляем запись о перемещении
    INSERT INTO public.movements (date, from_group, to_group, reason)
    VALUES (CURRENT_DATE, OLD.group_id, NEW.group_id, 'Автоматическое перемещение при изменении группы')
    RETURNING id INTO movement_id;
    
    -- Вставляем связь с животным
    IF movement_id IS NOT NULL THEN
      INSERT INTO public.movement_animals (movement_id, animal_id)
      VALUES (movement_id, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для синхронизации данных при изменении статуса животного
CREATE OR REPLACE FUNCTION public.sync_animal_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Проверяем, что статус изменился на "Архив"
  IF NEW.status = 'Архив' AND (OLD.status IS NULL OR OLD.status <> 'Архив') THEN
    -- Отмечаем все активные лечения как завершенные с типом "disposal"
    UPDATE public.active_treatments
    SET 
      is_completed = true,
      completion_type = 'disposal',
      completion_date = CURRENT_TIMESTAMP,
      completion_comment = 'Автоматическое завершение при изменении статуса животного на "Архив"'
    WHERE 
      animal_id = NEW.id 
      AND is_completed = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для обновления статуса животного при завершении лечения
CREATE OR REPLACE FUNCTION public.update_animal_on_treatment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Если лечение завершено и тип завершения - выбытие
  IF NEW.is_completed = true AND NEW.completion_type = 'disposal' THEN
    -- Обновляем статус животного на "Архив"
    UPDATE public.animals
    SET status = 'Архив'
    WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для обновления статуса животного при положительном тесте стельности
CREATE OR REPLACE FUNCTION public.update_animal_on_pregnancy_test()
RETURNS TRIGGER AS $$
BEGIN
  -- Если тест положительный, обновляем статус на "Стел" и рассчитываем дату отёла
  IF NEW.result = 'positive' THEN
    UPDATE public.animals
    SET 
      status = 'Стел',
      next_calving_date = (NEW.date::date + INTERVAL '285 days')::date
    WHERE id = NEW.animal_id;
  -- Если тест отрицательный, обновляем статус на "Ялов"
  ELSIF NEW.result = 'negative' THEN
    UPDATE public.animals
    SET status = 'Ялов'
    WHERE id = NEW.animal_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Добавление индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_animals_number ON public.animals(number);
CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);

-- Создаем триггеры только после того, как таблица animals будет заполнена данными
-- Это предотвратит срабатывание триггеров на пустой таблице
DO $$
BEGIN
  -- Проверяем, что таблица animals существует и имеет данные
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'animals'
  ) THEN
    -- Триггер для синхронизации изменений группы животного
    DROP TRIGGER IF EXISTS trigger_sync_animal_group_changes ON public.animals;
    
    CREATE TRIGGER trigger_sync_animal_group_changes
    AFTER UPDATE ON public.animals
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_animal_group_changes();
    
    -- Триггер для синхронизации изменений статуса животного
    DROP TRIGGER IF EXISTS trigger_sync_animal_status_changes ON public.animals;
    
    CREATE TRIGGER trigger_sync_animal_status_changes
    AFTER UPDATE ON public.animals
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_animal_status_changes();
  END IF;
  
  -- Триггер для обновления статуса животного при завершении лечения
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'active_treatments'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_update_animal_on_treatment_completion ON public.active_treatments;
    
    CREATE TRIGGER trigger_update_animal_on_treatment_completion
    AFTER UPDATE ON public.active_treatments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_animal_on_treatment_completion();
  END IF;
  
  -- Триггер для обновления статуса животного при тесте стельности
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pregnancy_tests'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_update_animal_on_pregnancy_test ON public.pregnancy_tests;
    
    CREATE TRIGGER trigger_update_animal_on_pregnancy_test
    AFTER INSERT ON public.pregnancy_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_animal_on_pregnancy_test();
  END IF;
END $$;