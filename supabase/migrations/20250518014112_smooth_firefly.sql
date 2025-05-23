/*
  # Создание таблицы журнала отелов

  1. New Tables
    - `calving_journal`
      - `id` (uuid, primary key)
      - `calving_id` (uuid, ссылка на отел)
      - `date` (date, дата отела)
      - `mother_number` (text, номер матери)
      - `status` (text, статус отела)
      - `child_number` (text, номер теленка)
      - `child_gender` (text, пол теленка)
      - `child_weight` (text, вес теленка)
      - `group_number` (text, номер группы)
      - `has_mastitis` (boolean, наличие мастита)
      - `executor_name` (text, имя исполнителя)
      - `notes` (text, примечания)
      - `created_at` (timestamp, дата создания записи)
  
  2. Security
    - Enable RLS on `calving_journal` table
    - Add policy for authenticated users
*/

-- Проверяем существование таблицы calving_journal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'calving_journal'
  ) THEN
    -- Создаем таблицу журнала отелов
    CREATE TABLE public.calving_journal (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      calving_id uuid REFERENCES public.calvings(id) ON DELETE SET NULL,
      date date NOT NULL,
      mother_number text NOT NULL,
      status text NOT NULL,
      child_number text,
      child_gender text,
      child_weight text,
      group_number text,
      has_mastitis boolean DEFAULT false,
      executor_name text,
      notes text,
      created_at timestamptz DEFAULT now()
    );

    -- Включаем RLS для таблицы журнала отелов
    ALTER TABLE public.calving_journal ENABLE ROW LEVEL SECURITY;

    -- Политики доступа для таблицы журнала отелов
    CREATE POLICY "All authenticated users can do anything with calving_journal"
      ON public.calving_journal
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Создаем функцию для автоматического добавления записи в журнал при создании отела
CREATE OR REPLACE FUNCTION public.add_calving_to_journal()
RETURNS TRIGGER AS $$
DECLARE
  mother_num text;
  executor_name text;
  group_num text;
  status_text text;
BEGIN
  -- Получаем номер матери
  SELECT number INTO mother_num FROM animals WHERE id = NEW.mother_id;
  
  -- Получаем имя исполнителя
  SELECT full_name INTO executor_name FROM users WHERE id = NEW.executor_id;
  
  -- Получаем номер группы
  SELECT number INTO group_num FROM groups WHERE id = NEW.child_group_id;
  
  -- Преобразуем статус в текст
  IF NEW.status = 'success' THEN
    status_text := 'Успешно';
  ELSIF NEW.status = 'abortion' THEN
    status_text := 'Аборт';
  ELSE
    status_text := 'Мертворождение';
  END IF;
  
  -- Добавляем запись в журнал отелов
  INSERT INTO calving_journal (
    calving_id,
    date,
    mother_number,
    status,
    child_number,
    child_gender,
    child_weight,
    group_number,
    has_mastitis,
    executor_name,
    notes
  ) VALUES (
    NEW.id,
    NEW.date,
    COALESCE(mother_num, 'Неизвестно'),
    status_text,
    NEW.child_number,
    CASE 
      WHEN NEW.child_gender = 'female' THEN 'Телка'
      WHEN NEW.child_gender = 'male' THEN 'Бычок'
      ELSE NULL
    END,
    NEW.child_weight,
    group_num,
    NEW.has_mastitis,
    executor_name,
    NEW.notes
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического добавления записи в журнал при создании отела
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_add_calving_to_journal'
  ) THEN
    CREATE TRIGGER trigger_add_calving_to_journal
      AFTER INSERT ON calvings
      FOR EACH ROW
      EXECUTE FUNCTION add_calving_to_journal();
  END IF;
END $$;

-- Создаем функцию для обновления записи в журнале при удалении отела
CREATE OR REPLACE FUNCTION public.update_journal_on_calving_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Помечаем запись в журнале как удаленную
  UPDATE calving_journal
  SET notes = CONCAT('УДАЛЕНО: ', COALESCE(OLD.deletion_reason, 'Причина не указана'))
  WHERE calving_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для обновления записи в журнале при удалении отела
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_journal_on_calving_delete'
  ) THEN
    CREATE TRIGGER trigger_update_journal_on_calving_delete
      AFTER UPDATE OF is_deleted ON calvings
      FOR EACH ROW
      WHEN (NEW.is_deleted = true)
      EXECUTE FUNCTION update_journal_on_calving_delete();
  END IF;
END $$;

-- Заполняем журнал отелов данными из существующих отелов
DO $$
DECLARE
  calving RECORD;
  mother_num text;
  executor_name text;
  group_num text;
  status_text text;
BEGIN
  -- Проверяем, есть ли уже записи в журнале
  IF NOT EXISTS (SELECT 1 FROM calving_journal LIMIT 1) THEN
    -- Для каждого отела в таблице calvings
    FOR calving IN SELECT * FROM calvings WHERE is_deleted = false LOOP
      -- Получаем номер матери
      SELECT number INTO mother_num FROM animals WHERE id = calving.mother_id;
      
      -- Получаем имя исполнителя
      SELECT full_name INTO executor_name FROM users WHERE id = calving.executor_id;
      
      -- Получаем номер группы
      SELECT number INTO group_num FROM groups WHERE id = calving.child_group_id;
      
      -- Преобразуем статус в текст
      IF calving.status = 'success' THEN
        status_text := 'Успешно';
      ELSIF calving.status = 'abortion' THEN
        status_text := 'Аборт';
      ELSE
        status_text := 'Мертворождение';
      END IF;
      
      -- Добавляем запись в журнал отелов
      INSERT INTO calving_journal (
        calving_id,
        date,
        mother_number,
        status,
        child_number,
        child_gender,
        child_weight,
        group_number,
        has_mastitis,
        executor_name,
        notes
      ) VALUES (
        calving.id,
        calving.date,
        COALESCE(mother_num, 'Неизвестно'),
        status_text,
        calving.child_number,
        CASE 
          WHEN calving.child_gender = 'female' THEN 'Телка'
          WHEN calving.child_gender = 'male' THEN 'Бычок'
          ELSE NULL
        END,
        calving.child_weight,
        group_num,
        calving.has_mastitis,
        executor_name,
        calving.notes
      );
    END LOOP;
  END IF;
END $$;