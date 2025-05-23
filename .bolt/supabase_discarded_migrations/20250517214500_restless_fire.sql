/*
  # Добавление каскадного удаления и синхронизации данных
  
  1. Изменения
    - Добавление ограничений ON DELETE CASCADE для связанных таблиц
    - Создание триггеров для синхронизации данных между таблицами
    - Обеспечение целостности данных при удалении записей
  
  2. Безопасность
    - Сохранение всех политик безопасности
    - Безопасное изменение ограничений внешнего ключа
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

-- Изменение ограничений внешнего ключа для таблицы inseminations
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'inseminations_animal_id_fkey' 
    AND table_name = 'inseminations'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.inseminations DROP CONSTRAINT inseminations_animal_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'inseminations' 
    AND column_name = 'animal_id'
  ) THEN
    ALTER TABLE public.inseminations
    ADD CONSTRAINT inseminations_animal_id_fkey
    FOREIGN KEY (animal_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Изменение ограничений внешнего ключа для таблицы calvings
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'calvings_mother_id_fkey' 
    AND table_name = 'calvings'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.calvings DROP CONSTRAINT calvings_mother_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'calvings' 
    AND column_name = 'mother_id'
  ) THEN
    ALTER TABLE public.calvings
    ADD CONSTRAINT calvings_mother_id_fkey
    FOREIGN KEY (mother_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Изменение ограничений внешнего ключа для таблицы vet_operations
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vet_operations_animal_id_fkey' 
    AND table_name = 'vet_operations'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.vet_operations DROP CONSTRAINT vet_operations_animal_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vet_operations' 
    AND column_name = 'animal_id'
  ) THEN
    ALTER TABLE public.vet_operations
    ADD CONSTRAINT vet_operations_animal_id_fkey
    FOREIGN KEY (animal_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Изменение ограничений внешнего ключа для таблицы active_treatments
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'active_treatments_animal_id_fkey' 
    AND table_name = 'active_treatments'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.active_treatments DROP CONSTRAINT active_treatments_animal_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'active_treatments' 
    AND column_name = 'animal_id'
  ) THEN
    ALTER TABLE public.active_treatments
    ADD CONSTRAINT active_treatments_animal_id_fkey
    FOREIGN KEY (animal_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Изменение ограничений внешнего ключа для таблицы pregnancy_tests
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'pregnancy_tests_animal_id_fkey' 
    AND table_name = 'pregnancy_tests'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.pregnancy_tests DROP CONSTRAINT pregnancy_tests_animal_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pregnancy_tests' 
    AND column_name = 'animal_id'
  ) THEN
    ALTER TABLE public.pregnancy_tests
    ADD CONSTRAINT pregnancy_tests_animal_id_fkey
    FOREIGN KEY (animal_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Изменение ограничений внешнего ключа для таблицы movement_animals
DO $$
BEGIN
  -- Проверяем существование ограничения
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'movement_animals_animal_id_fkey' 
    AND table_name = 'movement_animals'
  ) THEN
    -- Удаляем существующее ограничение
    ALTER TABLE public.movement_animals DROP CONSTRAINT movement_animals_animal_id_fkey;
  END IF;
  
  -- Добавляем новое ограничение с ON DELETE CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'movement_animals' 
    AND column_name = 'animal_id'
  ) THEN
    ALTER TABLE public.movement_animals
    ADD CONSTRAINT movement_animals_animal_id_fkey
    FOREIGN KEY (animal_id)
    REFERENCES public.animals(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Создание триггера для синхронизации данных при изменении группы животного
CREATE OR REPLACE FUNCTION public.sync_animal_group_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Если изменилась группа животного, создаем запись о перемещении
  IF OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    -- Вставляем запись о перемещении
    INSERT INTO public.movements (date, from_group, to_group, reason)
    VALUES (CURRENT_DATE, OLD.group_id, NEW.group_id, 'Автоматическое перемещение при изменении группы')
    RETURNING id INTO NEW.last_movement_id;
    
    -- Вставляем связь с животным
    INSERT INTO public.movement_animals (movement_id, animal_id)
    VALUES (NEW.last_movement_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для синхронизации данных при изменении статуса животного
CREATE OR REPLACE FUNCTION public.sync_animal_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Если изменился статус животного на "Архив"
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Архив' THEN
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

-- Создание триггера для обновления статуса животного при завершении лечения
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

-- Создание триггера для обновления статуса животного при положительном тесте стельности
CREATE OR REPLACE FUNCTION public.update_animal_on_pregnancy_test()
RETURNS TRIGGER AS $$
DECLARE
  animal_record public.animals%ROWTYPE;
BEGIN
  -- Получаем запись о животном
  SELECT * INTO animal_record FROM public.animals WHERE id = NEW.animal_id;
  
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

-- Безопасное создание триггеров с проверкой их существования
DO $$
BEGIN
  -- Триггер для синхронизации изменений группы животного
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_animal_group_changes'
  ) THEN
    CREATE TRIGGER trigger_sync_animal_group_changes
    AFTER UPDATE OF group_id ON public.animals
    FOR EACH ROW
    WHEN (OLD.group_id IS DISTINCT FROM NEW.group_id)
    EXECUTE FUNCTION public.sync_animal_group_changes();
  END IF;
  
  -- Триггер для синхронизации изменений статуса животного
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_animal_status_changes'
  ) THEN
    CREATE TRIGGER trigger_sync_animal_status_changes
    AFTER UPDATE OF status ON public.animals
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.sync_animal_status_changes();
  END IF;
  
  -- Триггер для обновления статуса животного при завершении лечения
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_animal_on_treatment_completion'
  ) THEN
    CREATE TRIGGER trigger_update_animal_on_treatment_completion
    AFTER UPDATE OF is_completed, completion_type ON public.active_treatments
    FOR EACH ROW
    WHEN (
      (OLD.is_completed IS DISTINCT FROM NEW.is_completed OR 
       OLD.completion_type IS DISTINCT FROM NEW.completion_type) AND
      NEW.is_completed = true
    )
    EXECUTE FUNCTION public.update_animal_on_treatment_completion();
  END IF;
  
  -- Триггер для обновления статуса животного при тесте стельности
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_animal_on_pregnancy_test'
  ) THEN
    CREATE TRIGGER trigger_update_animal_on_pregnancy_test
    AFTER INSERT ON public.pregnancy_tests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_animal_on_pregnancy_test();
  END IF;
END $$;

-- Добавление индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_animals_number ON public.animals(number);
CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);