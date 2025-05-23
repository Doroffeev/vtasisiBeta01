/*
  # Создание функций и триггеров для синхронизации данных
  
  1. Функции
    - sync_animal_group_changes - для синхронизации при изменении группы животного
    - sync_animal_status_changes - для синхронизации при изменении статуса животного
    - update_animal_on_treatment_completion - для обновления статуса при завершении лечения
    - update_animal_on_pregnancy_test - для обновления статуса при тесте стельности
  
  2. Триггеры
    - trigger_sync_animal_group_changes - для таблицы animals
    - trigger_sync_animal_status_changes - для таблицы animals
    - trigger_update_animal_on_treatment_completion - для таблицы active_treatments
    - trigger_update_animal_on_pregnancy_test - для таблицы pregnancy_tests
*/

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

-- Создаем триггеры только после того, как таблица animals будет заполнена данными
DO $$
BEGIN
  -- Проверяем, что таблица animals существует
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