/*
  # Создание таблиц для отгрузки животных
  
  1. Новые таблицы
    - `buyers` - таблица покупателей
      - `id` (uuid, первичный ключ)
      - `name` (text)
      - `phone` (text)
      - `vehicle_number` (text)
      - `address` (text)
      - `contact_person` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `shipments` - таблица отгрузок
      - `id` (uuid, первичный ключ)
      - `date` (date)
      - `animal_id` (uuid, внешний ключ)
      - `buyer_id` (uuid, внешний ключ)
      - `vehicle_number` (text)
      - `driver_name` (text)
      - `proxy_number` (text)
      - `released_by_id` (uuid, внешний ключ)
      - `accepted_by` (text)
      - `price` (numeric)
      - `weight` (numeric)
      - `comments` (text)
      - `created_at` (timestamptz)
      - `deleted_at` (timestamptz)
      - `deleted_by` (uuid, внешний ключ)
      - `deleted_reason` (text)

    - `shipment_logs` - журнал действий с отгрузками
      - `id` (uuid, первичный ключ)
      - `shipment_id` (uuid, внешний ключ)
      - `user_id` (uuid, внешний ключ)
      - `action` (text)
      - `details` (text)
      - `timestamp` (timestamptz)

  2. Безопасность
    - Включение RLS для всех таблиц
    - Добавление политик для управления доступом

  3. Связи
    - Связь между shipments и animals
    - Связь между shipments и buyers
    - Связь между shipments и users
    - Связь между shipment_logs и shipments
    - Связь между shipment_logs и users
*/

-- Создание таблицы покупателей (buyers)
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

-- Создание таблицы отгрузок (shipments)
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  animal_id uuid,
  buyer_id uuid REFERENCES public.buyers(id),
  vehicle_number text NOT NULL,
  driver_name text NOT NULL,
  proxy_number text NOT NULL,
  released_by_id uuid REFERENCES public.users(id),
  accepted_by text NOT NULL,
  price numeric,
  weight numeric,
  comments text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id),
  deleted_reason text
);

-- Включение RLS для таблицы отгрузок
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Создание таблицы журнала действий с отгрузками (shipment_logs)
CREATE TABLE IF NOT EXISTS public.shipment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  user_id uuid REFERENCES public.users(id),
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Включение RLS для таблицы журнала действий
ALTER TABLE public.shipment_logs ENABLE ROW LEVEL SECURITY;

-- Создание таблицы журнала действий (action_logs) для хранения всех действий пользователей
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

-- Создание политик безопасности для таблицы покупателей
CREATE POLICY "All authenticated users can do anything with buyers"
  ON public.buyers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание политик безопасности для таблицы отгрузок
CREATE POLICY "All authenticated users can do anything with shipments"
  ON public.shipments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание политик безопасности для таблицы журнала действий с отгрузками
CREATE POLICY "All authenticated users can do anything with shipment_logs"
  ON public.shipment_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Создание политик безопасности для таблицы журнала действий
CREATE POLICY "All authenticated users can do anything with action_logs"
  ON public.action_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Начальные данные для таблицы покупателей
INSERT INTO public.buyers (name, phone, vehicle_number, address, contact_person, is_active)
VALUES 
  ('ООО "Агрокомплекс"', '+7 (999) 123-45-67', 'А123БВ 36', 'г. Воронеж, ул. Ленина, 15', 'Иванов Иван Иванович', true),
  ('КФХ "Заря"', '+7 (999) 765-43-21', 'В567ГД 36', 'Воронежская обл., Семилукский р-н', 'Петров Петр Петрович', true),
  ('ИП Сидоров А.А.', '+7 (999) 111-22-33', 'Е789ЖЗ 36', 'г. Воронеж, ул. Кирова, 5', 'Сидоров Алексей Александрович', true)
ON CONFLICT DO NOTHING;