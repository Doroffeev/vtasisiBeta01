/*
  # Исправление ограничения внешнего ключа для таблицы calving_logs
  
  1. Изменения:
    - Модификация ограничения внешнего ключа для разрешения NULL значений
    - Добавление действия ON DELETE SET NULL для каскадного обновления при удалении записи отёла
    
  2. Преимущества:
    - Сохранение исторических записей о действиях даже после удаления связанных записей
    - Предотвращение ошибок нарушения целостности ссылок при удалении
    - Безопасное удаление отёлов с сохранением истории действий
*/

-- Проверяем существование таблицы calving_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'calving_logs'
  ) THEN
    -- Удаляем существующее ограничение внешнего ключа, если оно есть
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'calving_logs_calving_id_fkey' 
      AND table_name = 'calving_logs'
    ) THEN
      ALTER TABLE public.calving_logs DROP CONSTRAINT calving_logs_calving_id_fkey;
    END IF;
    
    -- Делаем колонку nullable, если она не является таковой
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'calving_logs' 
      AND column_name = 'calving_id' 
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.calving_logs ALTER COLUMN calving_id DROP NOT NULL;
    END IF;
    
    -- Добавляем новое ограничение с ON DELETE SET NULL
    ALTER TABLE public.calving_logs
    ADD CONSTRAINT calving_logs_calving_id_fkey 
    FOREIGN KEY (calving_id) 
    REFERENCES public.calvings(id)
    ON DELETE SET NULL;
  END IF;
END $$;