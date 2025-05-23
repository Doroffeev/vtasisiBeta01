import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Получаем учетные данные Supabase из аргументов командной строки или environment
const supabaseUrl = process.argv[2] || process.env.SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('\x1b[31m%s\x1b[0m', 'Ошибка: необходимо указать URL и SERVICE_ROLE_KEY для Supabase');
  console.log('\x1b[33m%s\x1b[0m', 'Пример: npm run setup:db https://your-url.supabase.co your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Функция для выполнения запроса SQL с обработкой ошибок
async function executeSQL(sql, description) {
  try {
    console.log(`Выполнение: ${description}...`);
    const { error } = await supabase.rpc('pgml_exec', { query: sql });
    
    if (error) {
      console.error(`\x1b[31mОшибка при выполнении ${description}:\x1b[0m`, error.message);
      throw error;
    }
    
    console.log(`\x1b[32m✓ ${description} выполнено успешно\x1b[0m`);
    return true;
  } catch (error) {
    console.error(`\x1b[31mПроизошла ошибка при ${description}:\x1b[0m`, error);
    return false;
  }
}

// Асинхронная функция для настройки базы данных
async function setupDatabase() {
  console.log('\x1b[34m%s\x1b[0m', '=== Настройка базы данных Supabase ===');

  try {
    // Путь к файлу с полной схемой базы данных
    const schemaPath = path.join(process.cwd(), 'supabase/migrations/create_database_schema.sql');
    
    // Проверяем существование файла
    if (!fs.existsSync(schemaPath)) {
      console.error('\x1b[31m%s\x1b[0m', 'Ошибка: файл схемы базы данных не найден!');
      console.log('\x1b[33m%s\x1b[0m', `Ожидаемый путь: ${schemaPath}`);
      process.exit(1);
    }

    // Читаем файл схемы
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    // Выполняем SQL для создания схемы
    const schemaSuccess = await executeSQL(schemaSQL, 'создание схемы базы данных');
    
    if (!schemaSuccess) {
      console.error('\x1b[31m%s\x1b[0m', '=== Не удалось настроить базу данных ===');
      process.exit(1);
    }

    // Проверка успешности установки
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (usersError) {
      console.error('\x1b[31m%s\x1b[0m', 'Проверка установки не удалась:', usersError.message);
    } else {
      console.log('\x1b[32m%s\x1b[0m', '=== База данных успешно настроена ===');
      console.log('\x1b[36m%s\x1b[0m', 'Данные для входа в систему:');
      console.log('\x1b[36m%s\x1b[0m', '- Администратор: admin/admin');
      console.log('\x1b[36m%s\x1b[0m', '- Руководитель: manager/manager');
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '=== Ошибка при настройке базы данных ===');
    console.error(error);
    process.exit(1);
  }
}

// Запускаем настройку базы данных
setupDatabase();