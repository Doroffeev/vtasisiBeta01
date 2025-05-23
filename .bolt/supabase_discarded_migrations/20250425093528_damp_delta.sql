/*
  # Создание таблицы номенклатуры препаратов

  1. Новые таблицы
    - `nomenclature`
      - `id` (uuid, первичный ключ)
      - `code` (text)
      - `name` (text)
      - `unit` (text)
      - `category` (text)
      - `created_at` (timestamp)
  2. Безопасность
    - Включение RLS для таблицы `nomenclature`
    - Добавление политики для чтения данных аутентифицированными пользователями
    - Добавление политики для обновления данных администраторами и менеджерами
*/

CREATE TABLE IF NOT EXISTS nomenclature (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Включение Row Level Security
ALTER TABLE nomenclature ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все пользователи могут читать данные номенклатуры"
  ON nomenclature
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Авторизованные пользователи могут обновлять данные номенклатуры"
  ON nomenclature
  FOR ALL
  TO authenticated
  USING (true);

-- Вставка начальных данных
INSERT INTO nomenclature (id, code, name, unit, category)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'АНТ-001', 'Пенициллин', 'мл', 'АНТИБИОТИК'),
  ('00000000-0000-0000-0000-000000000002', 'ВАК-001', 'Вакцина против ящура', 'мл', 'ВАКЦИНА')
ON CONFLICT (id) DO NOTHING;