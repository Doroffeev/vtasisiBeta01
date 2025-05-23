/*
  # Изменение таблицы inseminations для использования ссылки на users вместо employees
  
  1. Изменения:
    - Удаление внешнего ключа на таблицу employees
    - Изменение ссылки executor_id для указания на таблицу users
    
  2. Безопасность:
    - Сохранение всех политик
    - Временное удаление и повторное создание ограничения
*/

-- Проверка существования таблицы inseminations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'inseminations'
  ) THEN
    -- Удаление существующего внешнего ключа, если он есть
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'inseminations_executor_id_fkey'
      AND table_name = 'inseminations'
    ) THEN
      ALTER TABLE public.inseminations DROP CONSTRAINT inseminations_executor_id_fkey;
    END IF;
    
    -- Добавление нового внешнего ключа на таблицу users
    ALTER TABLE public.inseminations
    ADD CONSTRAINT inseminations_executor_id_fkey
    FOREIGN KEY (executor_id)
    REFERENCES public.users(id);
    
    -- Создаем комментарий к колонке для документации изменения
    COMMENT ON COLUMN public.inseminations.executor_id IS 'ID пользователя-исполнителя с ролью INSEMINATOR из таблицы users';
  END IF;
END $$;