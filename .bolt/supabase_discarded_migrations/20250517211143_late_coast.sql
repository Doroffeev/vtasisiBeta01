/*
# Интеграция ветеринарных операций и схем лечения

1. Индексы
   - Добавление индексов для оптимизации запросов по животным
   - Добавление индексов для связи между таблицами

2. Триггеры
   - Создание триггеров для автоматической синхронизации данных
*/

-- Добавляем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_vet_operations_animal_id ON public.vet_operations(animal_id);
CREATE INDEX IF NOT EXISTS idx_active_treatments_animal_id ON public.active_treatments(animal_id);
CREATE INDEX IF NOT EXISTS idx_vet_operations_date ON public.vet_operations(date);
CREATE INDEX IF NOT EXISTS idx_active_treatments_start_date ON public.active_treatments(start_date);

-- Создаем представление для получения всех ветеринарных операций животного
CREATE OR REPLACE VIEW public.animal_vet_operations AS
SELECT 
    v.id,
    v.date,
    v.time,
    v.code,
    v.price,
    v.executor_id,
    v.result,
    v.animal_id,
    v.is_deleted,
    v.deletion_reason,
    v.deletion_date,
    v.is_cancelled,
    v.cancellation_reason,
    v.cancellation_date,
    v.created_at,
    u.full_name as executor_name
FROM 
    public.vet_operations v
LEFT JOIN 
    public.users u ON v.executor_id = u.id;

-- Создаем представление для получения всех схем лечения животного
CREATE OR REPLACE VIEW public.animal_treatments AS
SELECT 
    at.id,
    at.scheme_id,
    at.animal_id,
    at.start_date,
    at.current_step,
    at.is_completed,
    at.completion_type,
    at.completion_date,
    at.completion_comment,
    at.created_at,
    ts.name as scheme_name,
    ts.description as scheme_description,
    u.full_name as supervisor_name
FROM 
    public.active_treatments at
LEFT JOIN 
    public.treatment_schemes ts ON at.scheme_id = ts.id
LEFT JOIN 
    public.users u ON ts.supervisor_id = u.id;

-- Создаем функцию для обновления статуса животного при завершении лечения
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

-- Создаем триггер для автоматического обновления статуса животного
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_animal_on_treatment_completion'
    ) THEN
        CREATE TRIGGER trigger_update_animal_on_treatment_completion
        AFTER UPDATE OF is_completed, completion_type ON public.active_treatments
        FOR EACH ROW
        WHEN (OLD.is_completed IS DISTINCT FROM NEW.is_completed OR 
              OLD.completion_type IS DISTINCT FROM NEW.completion_type)
        EXECUTE FUNCTION public.update_animal_on_treatment_completion();
    END IF;
END $$;

-- Добавляем политики доступа к представлениям
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'All authenticated users can view animal_vet_operations'
    ) THEN
        CREATE POLICY "All authenticated users can view animal_vet_operations"
        ON public.animal_vet_operations
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'All authenticated users can view animal_treatments'
    ) THEN
        CREATE POLICY "All authenticated users can view animal_treatments"
        ON public.animal_treatments
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END $$;

-- Включаем RLS для представлений
ALTER VIEW public.animal_vet_operations OWNER TO postgres;
ALTER VIEW public.animal_treatments OWNER TO postgres;