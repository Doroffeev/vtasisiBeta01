/*
  # Создание триггеров для таблицы animals
  
  1. Триггеры
    - Триггер для синхронизации изменений группы животного
    - Триггер для синхронизации изменений статуса животного
    - Триггер для обновления статуса животного при завершении лечения
    - Триггер для обновления статуса животного при тесте стельности
  
  2. Безопасность
    - Проверка существования таблиц перед созданием триггеров
*/

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