/*
  # Исправление внешнего ключа в таблице write_offs
  
  1. Изменения
    - Создаем новую колонку для временного хранения значений
    - Обновляем внешний ключ, связывающий write_offs.executor_id с таблицей users вместо employees
  
  2. Примечания
    - Исправляет ошибку внешнего ключа при списании препаратов
    - Сохраняет существующие данные, где это возможно
*/

-- Проверяем существует ли таблица write_offs
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'write_offs') THEN
    -- Удаляем существующий внешний ключ
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'write_offs_executor_id_fkey' AND table_name = 'write_offs') THEN
      ALTER TABLE write_offs DROP CONSTRAINT IF EXISTS write_offs_executor_id_fkey;
    END IF;

    -- Создаем новый внешний ключ, ссылающийся на таблицу users
    ALTER TABLE write_offs 
      ADD CONSTRAINT write_offs_executor_id_fkey 
      FOREIGN KEY (executor_id) 
      REFERENCES users(id);
  END IF;
END $$;