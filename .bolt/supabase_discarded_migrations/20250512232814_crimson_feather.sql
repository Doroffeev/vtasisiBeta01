/*
  # Создание таблицы для связи отгрузок с животными
  
  1. Новые таблицы
    - `shipment_animals` - таблица связи отгрузок с животными
      - `id` (uuid, первичный ключ)
      - `shipment_id` (uuid, внешний ключ)
      - `animal_id` (uuid, внешний ключ)
      - `animal_number` (text)
      - `weight` (numeric)
      - `price` (numeric)
      - `created_at` (timestamptz)
  
  2. Изменения в таблице shipments
    - Удаляем связь с конкретным животным (animal_id)
    - Удаляем поля weight и price, они теперь в shipment_animals
    - Добавляем поле total_amount для хранения общей суммы
  
  3. Безопасность
    - Включение RLS для новой таблицы
    - Добавление политик для управления доступом
*/

-- Создание таблицы связи отгрузок с животными
CREATE TABLE IF NOT EXISTS public.shipment_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid REFERENCES public.shipments(id),
  animal_id uuid, -- Ссылка на животное (без внешнего ключа для совместимости)
  animal_number text NOT NULL, -- Номер животного для сохранения в истории
  weight numeric, -- Вес животного
  price numeric, -- Цена за животное
  created_at timestamptz DEFAULT now()
);

-- Включение RLS для таблицы связи
ALTER TABLE public.shipment_animals ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для таблицы связи
CREATE POLICY "All authenticated users can do anything with shipment_animals"
  ON public.shipment_animals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Изменение таблицы shipments - добавление поля total_amount
-- Но не удаляем animal_id и связанные поля для обратной совместимости
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'shipments' 
      AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE public.shipments 
    ADD COLUMN total_amount numeric;
  END IF;
END $$;