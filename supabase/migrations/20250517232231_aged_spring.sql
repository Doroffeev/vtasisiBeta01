/*
  # Полная схема базы данных для приложения "Ветеринарный ассистент"
  
  Создает все необходимые таблицы и настраивает связи между ними.
  Также устанавливает Row Level Security (RLS) и необходимые политики.
*/

-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN', 'CARETAKER', 'INSEMINATOR')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы пользователей
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы пользователей
CREATE POLICY "All authenticated users can do anything with users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы сотрудников
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL CHECK (position IN ('VET', 'INSEMINATOR', 'CARETAKER', 'ZOOTECHNICIAN')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы сотрудников
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы сотрудников
CREATE POLICY "All authenticated users can do anything with employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы групп животных
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы групп
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы групп
CREATE POLICY "All authenticated users can do anything with groups"
  ON public.groups
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы животных
CREATE TABLE IF NOT EXISTS public.animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- Номер животного
  group_id uuid REFERENCES public.groups(id),
  status text NOT NULL DEFAULT 'Без',
  birth_date date,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  mother_id uuid,
  last_calving_date date,
  last_insemination_date date,
  insemination_count integer DEFAULT 0,
  is_under_treatment boolean DEFAULT false,
  has_mastitis boolean DEFAULT false,
  mastitis_start_date date,
  treatment_end_date timestamptz,
  treatment_end_executor_id uuid,
  next_calving_date date,
  lactation integer DEFAULT 0,
  responder text,
  days_in_milk integer,
  weight numeric,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы животных
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы животных
CREATE POLICY "All authenticated users can do anything with animals"
  ON public.animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы перемещений
CREATE TABLE IF NOT EXISTS public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  from_group uuid REFERENCES public.groups(id),
  to_group uuid REFERENCES public.groups(id),
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы перемещений
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы перемещений
CREATE POLICY "All authenticated users can do anything with movements"
  ON public.movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы связи перемещений с животными
CREATE TABLE IF NOT EXISTS public.movement_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id uuid REFERENCES public.movements(id),
  animal_id uuid
);

-- Включение RLS для таблицы связи перемещений с животными
ALTER TABLE public.movement_animals ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы связи перемещений с животными
CREATE POLICY "All authenticated users can do anything with movement_animals"
  ON public.movement_animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы номенклатуры
CREATE TABLE IF NOT EXISTS public.nomenclature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL CHECK (unit IN ('шт', 'мл', 'гр')),
  category text NOT NULL CHECK (category IN ('АНТИБИОТИК', 'ВАКЦИНА', 'ВИТАМИН', 'ДРУГОЕ')),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы номенклатуры
ALTER TABLE public.nomenclature ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы номенклатуры
CREATE POLICY "All authenticated users can do anything with nomenclature"
  ON public.nomenclature
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы препаратов
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id uuid REFERENCES public.nomenclature(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  invoice_number text NOT NULL,
  remaining_quantity integer NOT NULL,
  receipt_date date NOT NULL,
  expiry_date date NOT NULL,
  batch_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы препаратов
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы препаратов
CREATE POLICY "All authenticated users can do anything with medications"
  ON public.medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы списаний
CREATE TABLE IF NOT EXISTS public.write_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  medication_id uuid REFERENCES public.medications(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  executor_id uuid REFERENCES public.employees(id),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы списаний
ALTER TABLE public.write_offs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы списаний
CREATE POLICY "All authenticated users can do anything with write_offs"
  ON public.write_offs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы быков-осеменителей
CREATE TABLE IF NOT EXISTS public.bulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  remaining_doses integer NOT NULL DEFAULT 0 CHECK (remaining_doses >= 0),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы быков
ALTER TABLE public.bulls ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы быков
CREATE POLICY "All authenticated users can do anything with bulls"
  ON public.bulls
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы осеменений
CREATE TABLE IF NOT EXISTS public.inseminations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time text NOT NULL,
  animal_id uuid,
  bull_id uuid REFERENCES public.bulls(id),
  executor_id uuid REFERENCES public.users(id),
  status text NOT NULL CHECK (status IN ('ОСЕМ', 'СТЕЛ', 'ЯЛОВАЯ')),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы осеменений
ALTER TABLE public.inseminations ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы осеменений
CREATE POLICY "All authenticated users can do anything with inseminations"
  ON public.inseminations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы журнала осеменений
CREATE TABLE IF NOT EXISTS public.insemination_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insemination_id uuid REFERENCES public.inseminations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала осеменений
ALTER TABLE public.insemination_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы журнала осеменений
CREATE POLICY "All authenticated users can do anything with insemination_logs"
  ON public.insemination_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы отелов
CREATE TABLE IF NOT EXISTS public.calvings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_id uuid,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'abortion', 'stillbirth')),
  child_id uuid,
  child_number text,
  child_responder text,
  child_group_id uuid,
  child_gender text CHECK (child_gender IN ('male', 'female')),
  child_weight text CHECK (
    child_weight IS NULL OR 
    child_weight = '' OR 
    (child_weight ~ '^[0-9]+(\.[0-9]+)?$' AND child_weight::numeric >= 0)
  ),
  notes text,
  has_mastitis boolean DEFAULT false,
  executor_id uuid,
  new_mother_group_id uuid,
  created_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text
);

-- Включение RLS для таблицы отелов
ALTER TABLE public.calvings ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы отелов
CREATE POLICY "All authenticated users can do anything with calvings"
  ON public.calvings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы журнала отелов
CREATE TABLE IF NOT EXISTS public.calving_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calving_id uuid REFERENCES public.calvings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала отелов
ALTER TABLE public.calving_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы журнала отелов
CREATE POLICY "All authenticated users can do anything with calving_logs"
  ON public.calving_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы тестов стельности
CREATE TABLE IF NOT EXISTS public.pregnancy_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  animal_id uuid,
  animal_number text NOT NULL,
  result text NOT NULL CHECK (result IN ('positive', 'negative')),
  executor_id uuid REFERENCES public.users(id),
  comments text,
  is_deleted boolean DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deletion_reason text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы тестов стельности
ALTER TABLE public.pregnancy_tests ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы тестов стельности
CREATE POLICY "All authenticated users can do anything with pregnancy_tests"
  ON public.pregnancy_tests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Добавление индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_animal_id ON public.pregnancy_tests(animal_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_date ON public.pregnancy_tests(date);
CREATE INDEX IF NOT EXISTS idx_pregnancy_tests_result ON public.pregnancy_tests(result);
CREATE INDEX IF NOT EXISTS idx_inseminations_animal_id ON public.inseminations(animal_id);
CREATE INDEX IF NOT EXISTS idx_inseminations_date ON public.inseminations(date);
CREATE INDEX IF NOT EXISTS idx_inseminations_status ON public.inseminations(status);
CREATE INDEX IF NOT EXISTS idx_animals_name ON public.animals(name);
CREATE INDEX IF NOT EXISTS idx_animals_group_id ON public.animals(group_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON public.animals(status);

-- Создание таблицы покупателей
CREATE TABLE IF NOT EXISTS public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  vehicle_number text NOT NULL,
  address text,
  contact_person text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы покупателей
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы покупателей
CREATE POLICY "All authenticated users can do anything with buyers"
  ON public.buyers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы отгрузок
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  animal_id uuid,
  animal_number text,
  buyer_id uuid REFERENCES public.buyers(id),
  buyer_name text,
  vehicle_number text NOT NULL,
  driver_name text NOT NULL,
  proxy_number text NOT NULL,
  released_by_id uuid REFERENCES public.users(id),
  releaser_name text,
  accepted_by text NOT NULL,
  price numeric,
  weight numeric,
  total_amount numeric,
  comments text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id),
  deleted_reason text
);

-- Включение RLS для таблицы отгрузок
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы отгрузок
CREATE POLICY "All authenticated users can do anything with shipments"
  ON public.shipments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы животных в отгрузке
CREATE TABLE IF NOT EXISTS public.shipment_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  animal_id uuid,
  animal_number text NOT NULL,
  weight numeric,
  price numeric,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы животных в отгрузке
ALTER TABLE public.shipment_animals ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы животных в отгрузке
CREATE POLICY "All authenticated users can do anything with shipment_animals"
  ON public.shipment_animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы журнала отгрузок
CREATE TABLE IF NOT EXISTS public.shipment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала отгрузок
ALTER TABLE public.shipment_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы журнала отгрузок
CREATE POLICY "All authenticated users can do anything with shipment_logs"
  ON public.shipment_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы журнала действий
CREATE TABLE IF NOT EXISTS public.action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  action_type text NOT NULL,
  entity_id uuid,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала действий
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы журнала действий
CREATE POLICY "All authenticated users can do anything with action_logs"
  ON public.action_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы ветеринарных операций
CREATE TABLE IF NOT EXISTS public.vet_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time text NOT NULL,
  code text NOT NULL,
  price numeric,
  executor_id uuid REFERENCES public.users(id),
  result text,
  animal_id uuid,
  is_deleted boolean DEFAULT false,
  deletion_reason text,
  deletion_date timestamptz,
  is_cancelled boolean DEFAULT false,
  cancellation_reason text,
  cancellation_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы ветеринарных операций
ALTER TABLE public.vet_operations ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы ветеринарных операций
CREATE POLICY "All authenticated users can do anything with vet_operations"
  ON public.vet_operations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы использования препаратов
CREATE TABLE IF NOT EXISTS public.medication_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.vet_operations(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы использования препаратов
ALTER TABLE public.medication_usages ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы использования препаратов
CREATE POLICY "All authenticated users can do anything with medication_usages"
  ON public.medication_usages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы комментариев к операциям
CREATE TABLE IF NOT EXISTS public.operation_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid REFERENCES public.vet_operations(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы комментариев
ALTER TABLE public.operation_comments ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы комментариев
CREATE POLICY "All authenticated users can do anything with operation_comments"
  ON public.operation_comments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы схем лечения
CREATE TABLE IF NOT EXISTS public.treatment_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  supervisor_id uuid REFERENCES public.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы схем лечения
ALTER TABLE public.treatment_schemes ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы схем лечения
CREATE POLICY "All authenticated users can do anything with treatment_schemes"
  ON public.treatment_schemes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы этапов лечения
CREATE TABLE IF NOT EXISTS public.treatment_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id) ON DELETE CASCADE,
  day integer NOT NULL,
  procedure text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы этапов лечения
ALTER TABLE public.treatment_steps ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы этапов лечения
CREATE POLICY "All authenticated users can do anything with treatment_steps"
  ON public.treatment_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы препаратов для этапов лечения
CREATE TABLE IF NOT EXISTS public.treatment_step_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid REFERENCES public.treatment_steps(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id),
  quantity integer NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы препаратов для этапов
ALTER TABLE public.treatment_step_medications ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы препаратов для этапов
CREATE POLICY "All authenticated users can do anything with treatment_step_medications"
  ON public.treatment_step_medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы активных лечений
CREATE TABLE IF NOT EXISTS public.active_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid REFERENCES public.treatment_schemes(id),
  animal_id uuid,
  start_date date NOT NULL,
  current_step integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completion_type text CHECK (completion_type IN ('discharge', 'disposal')),
  completion_date timestamptz,
  completion_comment text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы активных лечений
ALTER TABLE public.active_treatments ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы активных лечений
CREATE POLICY "All authenticated users can do anything with active_treatments"
  ON public.active_treatments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы выполненных этапов лечения
CREATE TABLE IF NOT EXISTS public.completed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES public.active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.treatment_steps(id),
  date date NOT NULL,
  result text NOT NULL,
  executor_id uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы выполненных этапов
ALTER TABLE public.completed_steps ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы выполненных этапов
CREATE POLICY "All authenticated users can do anything with completed_steps"
  ON public.completed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание таблицы пропущенных этапов лечения
CREATE TABLE IF NOT EXISTS public.missed_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid REFERENCES public.active_treatments(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.treatment_steps(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы пропущенных этапов
ALTER TABLE public.missed_steps ENABLE ROW LEVEL SECURITY;

-- Политики доступа для таблицы пропущенных этапов
CREATE POLICY "All authenticated users can do anything with missed_steps"
  ON public.missed_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание функции для синхронизации изменений группы животного
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

-- Создание функции для синхронизации при изменении статуса животного
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

-- Создание функции для обновления статуса животного при тесте стельности
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

-- Создание функции для проверки номеров групп
CREATE OR REPLACE FUNCTION public.validate_group_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Функция оставлена для совместимости
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создание триггеров
CREATE TRIGGER trigger_sync_animal_group_changes
  AFTER UPDATE ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_animal_group_changes();

CREATE TRIGGER trigger_sync_animal_status_changes
  AFTER UPDATE ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_animal_status_changes();

CREATE TRIGGER trigger_update_animal_on_treatment_completion
  AFTER UPDATE ON public.active_treatments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_animal_on_treatment_completion();

CREATE TRIGGER trigger_update_animal_on_pregnancy_test
  AFTER INSERT ON public.pregnancy_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_animal_on_pregnancy_test();

CREATE TRIGGER trigger_validate_group_number
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_group_number();

-- Добавление начальных данных

-- Добавление пользователей
INSERT INTO public.users (username, full_name, role, is_active)
VALUES 
  ('admin', 'Администратор', 'ADMIN', true),
  ('manager', 'Руководитель', 'MANAGER', true),
  ('vet', 'Ветеринар', 'VET', true),
  ('inseminator', 'Осеминатор', 'INSEMINATOR', true),
  ('caretaker', 'Телятница', 'CARETAKER', true),
  ('zootechnician', 'Зоотехник', 'ZOOTECHNICIAN', true)
ON CONFLICT (username) DO NOTHING;

-- Добавление сотрудников
INSERT INTO public.employees (full_name, position, is_active)
VALUES 
  ('Петров Александр Иванович', 'VET', true),
  ('Иванова Мария Сергеевна', 'INSEMINATOR', true),
  ('Сидорова Анна Петровна', 'CARETAKER', true),
  ('Козлов Дмитрий Николаевич', 'ZOOTECHNICIAN', true)
ON CONFLICT DO NOTHING;

-- Добавление групп
INSERT INTO public.groups (number, description)
VALUES 
  ('1', 'Основное стадо'),
  ('2', 'Коровы в сухостое'),
  ('3', 'Молодые коровы')
ON CONFLICT DO NOTHING;

-- Добавление номенклатуры
INSERT INTO public.nomenclature (code, name, unit, category)
VALUES 
  ('АНТ-001', 'Пенициллин', 'мл', 'АНТИБИОТИК'),
  ('ВАК-001', 'Вакцина против ящура', 'мл', 'ВАКЦИНА'),
  ('ВИТ-001', 'Комплекс витаминов', 'мл', 'ВИТАМИН'),
  ('ДР-001', 'Физраствор', 'мл', 'ДРУГОЕ')
ON CONFLICT DO NOTHING;

-- Добавление быков
INSERT INTO public.bulls (code, name, price, remaining_doses)
VALUES 
  ('BULL-001', 'Бык 1', 5000, 10),
  ('BULL-002', 'Бык 2', 6000, 15)
ON CONFLICT DO NOTHING;

-- Добавление покупателей
INSERT INTO public.buyers (name, phone, vehicle_number, address, contact_person)
VALUES 
  ('ООО "Агрокомплекс"', '+7 (999) 123-45-67', 'А123БВ 36', 'г. Воронеж, ул. Ленина, 15', 'Иванов Иван Иванович'),
  ('КФХ "Заря"', '+7 (999) 765-43-21', 'В567ГД 36', 'Воронежская обл., Семилукский р-н', 'Петров Петр Петрович')
ON CONFLICT DO NOTHING;

-- Добавление тестовых животных
INSERT INTO public.animals (name, group_id, status, gender, birth_date, lactation, responder)
SELECT
  '0' || (1000 + i)::text,  -- name (номер животного)
  (SELECT id FROM public.groups ORDER BY RANDOM() LIMIT 1), -- group_id (случайная группа)
  CASE WHEN RANDOM() < 0.7 THEN 'Без' ELSE 'Осем' END, -- status
  'female', -- gender
  CURRENT_DATE - (RANDOM() * 1000)::integer, -- birth_date (случайная дата рождения)
  (RANDOM() * 3)::integer, -- lactation (случайный номер лактации)
  '5' || (10000000 + (RANDOM() * 9999999)::integer)::text -- responder (случайный номер респондера)
FROM generate_series(1, 10) i
ON CONFLICT DO NOTHING;