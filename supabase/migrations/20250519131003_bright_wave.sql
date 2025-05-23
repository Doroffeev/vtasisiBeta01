/*
  # Создание таблиц для плановых ветеринарных операций

  1. Новые таблицы
     - `operation_templates` - шаблоны плановых операций
     - `operation_steps` - шаги шаблонов операций
     - `assigned_plans` - планы, назначенные конкретным животным
     - `scheduled_operations` - запланированные операции 

  2. Связи
     - Steps связаны с Templates
     - Assigned Plans связаны с Templates и Animals
     - Scheduled Operations связаны с Assigned Plans, Steps и Animals

  3. Безопасность
     - Добавление RLS политик для всех таблиц
*/

-- Таблица шаблонов плановых операций
CREATE TABLE IF NOT EXISTS operation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Таблица шагов шаблонов операций
CREATE TABLE IF NOT EXISTS operation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES operation_templates(id) ON DELETE CASCADE,
  operation_type text NOT NULL, -- INSEMINATION, PREGNANCY_TEST, etc.
  name text NOT NULL,
  days_after_previous integer NOT NULL,
  change_status text, -- опционально: изменить статус животного
  change_group_id uuid REFERENCES groups(id), -- опционально: перевести в группу
  description text,
  sort_order integer NOT NULL, -- порядок шагов
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Таблица назначенных планов для животных
CREATE TABLE IF NOT EXISTS assigned_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES operation_templates(id),
  animal_id uuid NOT NULL REFERENCES animals(id),
  start_date date NOT NULL,
  current_step integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Таблица запланированных операций
CREATE TABLE IF NOT EXISTS scheduled_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES assigned_plans(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES operation_steps(id),
  animal_id uuid NOT NULL REFERENCES animals(id),
  operation_type text NOT NULL,
  scheduled_date date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_date timestamptz,
  completed_operation_id uuid, -- ссылка на фактически выполненную операцию (если есть)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Включение RLS
ALTER TABLE operation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_operations ENABLE ROW LEVEL SECURITY;

-- Политики для шаблонов плановых операций
CREATE POLICY "All authenticated users can view templates"
  ON operation_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins, managers, and vets can insert templates"
  ON operation_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

CREATE POLICY "Admins, managers, and vets can update templates"
  ON operation_templates
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

CREATE POLICY "Admins, managers, and vets can delete templates"
  ON operation_templates
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

-- Политики для шагов шаблонов
CREATE POLICY "All authenticated users can view steps"
  ON operation_steps
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins, managers, and vets can insert steps"
  ON operation_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

CREATE POLICY "Admins, managers, and vets can update steps"
  ON operation_steps
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

CREATE POLICY "Admins, managers, and vets can delete steps"
  ON operation_steps
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

-- Политики для назначенных планов
CREATE POLICY "All authenticated users can view assigned plans"
  ON assigned_plans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins, managers, vets, and zootechnicians can insert plans"
  ON assigned_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN')
    )
  );

CREATE POLICY "Admins, managers, vets, and zootechnicians can update plans"
  ON assigned_plans
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN')
    )
  );

CREATE POLICY "Admins, managers, and vets can delete plans"
  ON assigned_plans
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

-- Политики для запланированных операций
CREATE POLICY "All authenticated users can view scheduled operations"
  ON scheduled_operations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins, managers, vets, and zootechnicians can insert operations"
  ON scheduled_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET', 'ZOOTECHNICIAN')
    )
  );

CREATE POLICY "All authenticated users can update operations"
  ON scheduled_operations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins, managers, and vets can delete operations"
  ON scheduled_operations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('ADMIN', 'MANAGER', 'VET')
    )
  );

-- Создаем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_operation_steps_template_id ON operation_steps(template_id);
CREATE INDEX IF NOT EXISTS idx_assigned_plans_template_id ON assigned_plans(template_id);
CREATE INDEX IF NOT EXISTS idx_assigned_plans_animal_id ON assigned_plans(animal_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_plan_id ON scheduled_operations(plan_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_animal_id ON scheduled_operations(animal_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_scheduled_date ON scheduled_operations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_is_completed ON scheduled_operations(is_completed);