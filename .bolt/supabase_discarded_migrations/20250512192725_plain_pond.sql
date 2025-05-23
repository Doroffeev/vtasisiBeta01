/*
  # Создание структуры базы данных
  
  Миграция создает все необходимые таблицы и настраивает безопасность на уровне строк (RLS)
  для ветеринарного приложения.
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

-- Создание политик безопасности для пользователей (безопасный способ)
DO $$
BEGIN
  -- Проверка существования политики для чтения собственных данных
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Проверка существования политики для администраторов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins can perform all operations on users'
  ) THEN
    CREATE POLICY "Admins can perform all operations on users"
      ON public.users
      FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'ADMIN'
        )
      );
  END IF;
END $$;

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

-- Создание политик безопасности для сотрудников (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Employees are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Employees are viewable by all authenticated users"
      ON public.employees
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Employees can be inserted by all authenticated users'
  ) THEN
    CREATE POLICY "Employees can be inserted by all authenticated users"
      ON public.employees
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Employees can be updated by admins and managers'
  ) THEN
    CREATE POLICY "Employees can be updated by admins and managers"
      ON public.employees
      FOR UPDATE
      TO authenticated
      USING (
        (auth.jwt() ->> 'role')::text = 'ADMIN' OR 
        (auth.jwt() ->> 'role')::text = 'MANAGER'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' AND policyname = 'Employees can be deleted by admins and managers'
  ) THEN
    CREATE POLICY "Employees can be deleted by admins and managers"
      ON public.employees
      FOR DELETE
      TO authenticated
      USING (
        (auth.jwt() ->> 'role')::text = 'ADMIN' OR 
        (auth.jwt() ->> 'role')::text = 'MANAGER'
      );
  END IF;
END $$;

-- Создание таблицы групп животных
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы групп
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для групп (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' AND policyname = 'Groups are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Groups are viewable by all authenticated users"
      ON public.groups
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'groups' AND policyname = 'Groups can be modified by admins, managers and zootehnicians'
  ) THEN
    CREATE POLICY "Groups can be modified by admins, managers and zootehnicians"
      ON public.groups
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'MANAGER' OR users.role = 'ZOOTECHNICIAN')
        )
      );
  END IF;
END $$;

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

-- Создание политик безопасности для номенклатуры (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nomenclature' AND policyname = 'Nomenclature items are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Nomenclature items are viewable by all authenticated users"
      ON public.nomenclature
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'nomenclature' AND policyname = 'Nomenclature items can be modified by admins, managers and vets'
  ) THEN
    CREATE POLICY "Nomenclature items can be modified by admins, managers and vets"
      ON public.nomenclature
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND (
            users.role = 'ADMIN' OR 
            users.role = 'MANAGER' OR 
            users.role = 'VET'
          )
        )
      );
  END IF;
END $$;

-- Создание таблицы препаратов
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id uuid REFERENCES public.nomenclature(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL,
  invoice_number text NOT NULL,
  remaining_quantity integer NOT NULL,
  receipt_date date NOT NULL,
  expiry_date date NOT NULL,
  batch_number text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы препаратов
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для препаратов (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'medications' AND policyname = 'Medications are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Medications are viewable by all authenticated users"
      ON public.medications
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'medications' AND policyname = 'Medications can be modified by admins, managers and vets'
  ) THEN
    CREATE POLICY "Medications can be modified by admins, managers and vets"
      ON public.medications
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND (
            users.role = 'ADMIN' OR 
            users.role = 'MANAGER' OR 
            users.role = 'VET'
          )
        )
      );
  END IF;
END $$;

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

-- Создание политик безопасности для списаний (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'write_offs' AND policyname = 'Write-offs are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Write-offs are viewable by all authenticated users"
      ON public.write_offs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'write_offs' AND policyname = 'Write-offs can be modified by admins, managers and vets'
  ) THEN
    CREATE POLICY "Write-offs can be modified by admins, managers and vets"
      ON public.write_offs
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND (
            users.role = 'ADMIN' OR 
            users.role = 'MANAGER' OR 
            users.role = 'VET'
          )
        )
      );
  END IF;
END $$;

-- Создание таблицы быков-осеменителей
CREATE TABLE IF NOT EXISTS public.bulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  remaining_doses integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы быков
ALTER TABLE public.bulls ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для быков (безопасный способ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bulls' AND policyname = 'Bulls are viewable by all authenticated users'
  ) THEN
    CREATE POLICY "Bulls are viewable by all authenticated users"
      ON public.bulls
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bulls' AND policyname = 'Bulls can be modified by authenticated users'
  ) THEN
    CREATE POLICY "Bulls can be modified by authenticated users"
      ON public.bulls
      FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Начальные данные
-- Добавление пользователей
INSERT INTO public.users (username, full_name, role, is_active)
VALUES 
  ('admin', 'Администратор', 'ADMIN', true),
  ('manager', 'Руководитель', 'MANAGER', true)
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
  ('ВАК-001', 'Вакцина против ящура', 'мл', 'ВАКЦИНА')
ON CONFLICT DO NOTHING;

-- Добавление препаратов (используем безопасный подход)
DO $$
DECLARE
  nomenclature_id_1 uuid;
  nomenclature_id_2 uuid;
BEGIN
  -- Получаем ID номенклатуры для препаратов
  SELECT id INTO nomenclature_id_1 FROM public.nomenclature WHERE code = 'АНТ-001' LIMIT 1;
  SELECT id INTO nomenclature_id_2 FROM public.nomenclature WHERE code = 'ВАК-001' LIMIT 1;
  
  -- Добавляем препараты, только если номенклатура существует
  IF nomenclature_id_1 IS NOT NULL THEN
    INSERT INTO public.medications (nomenclature_id, quantity, unit_price, invoice_number, remaining_quantity, receipt_date, expiry_date, batch_number)
    VALUES (nomenclature_id_1, 1000, 150, 'INV-001', 850, '2024-03-01', '2025-03-01', 'BATCH-001')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF nomenclature_id_2 IS NOT NULL THEN
    INSERT INTO public.medications (nomenclature_id, quantity, unit_price, invoice_number, remaining_quantity, receipt_date, expiry_date, batch_number)
    VALUES (nomenclature_id_2, 50, 300, 'INV-002', 42, '2024-03-15', '2025-03-15', 'BATCH-002')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Добавление быков
INSERT INTO public.bulls (code, name, price, remaining_doses)
VALUES 
  ('BULL-001', 'Бык 1', 5000, 10),
  ('BULL-002', 'Бык 2', 6000, 15)
ON CONFLICT DO NOTHING;