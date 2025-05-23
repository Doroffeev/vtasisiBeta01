import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Проверка на наличие переменных окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Функция для получения учетных данных из localStorage
const getLocalStorageCredentials = () => {
  try {
    const url = localStorage.getItem('supabaseUrl');
    const key = localStorage.getItem('supabaseKey');
    return { url, key };
  } catch (error) {
    console.error('Ошибка при получении учетных данных из localStorage:', error);
    return { url: null, key: null };
  }
};

// Получаем учетные данные из localStorage, если они есть
const localCredentials = getLocalStorageCredentials();

// Используем переменные окружения или данные из localStorage
const finalSupabaseUrl = supabaseUrl || localCredentials.url;
const finalSupabaseKey = supabaseAnonKey || localCredentials.key;

// Проверка наличия необходимых учетных данных
let supabase = null;
try {
  if (finalSupabaseUrl && finalSupabaseKey) {
    console.log('Создание клиента Supabase с URL:', finalSupabaseUrl);
    supabase = createClient<Database>(finalSupabaseUrl, finalSupabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      global: {
        headers: { 
          'x-application-name': 'vet-assistant',
          'X-Client-Info': 'vet-assistant/1.0.0'
        }
      },
      db: {
        schema: 'public'
      },
      // Добавляем настройки для fetch запросов
      fetch: (url, init) => {
        // Настраиваем таймаут для запросов
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
        
        // Добавляем сигнал abort для прерывания запроса по таймауту
        const fetchInit = {
          ...init,
          signal: controller.signal
        };
        
        return fetch(url, fetchInit)
          .then(response => {
            clearTimeout(timeoutId);
            return response;
          })
          .catch(error => {
            clearTimeout(timeoutId);
            console.error('Ошибка запроса Supabase:', error);
            throw error;
          });
      }
    });
    
    // Проверяем инициализацию клиента сразу после создания
    if (supabase) {
      console.log('Клиент Supabase успешно инициализирован');
    } else {
      console.error('Ошибка: клиент Supabase не был инициализирован несмотря на наличие учетных данных');
    }
  } else {
    console.warn('Не найдены учетные данные для Supabase. Приложение будет работать в режиме мок-данных.');
  }
} catch (error) {
  console.error('Ошибка при создании клиента Supabase:', error);
}

// Функция для проверки подключения к Supabase с тайм-аутом
export const checkSupabaseConnection = async () => {
  if (!supabase) {
    console.warn('Проверка подключения невозможна: клиент Supabase не инициализирован');
    return false;
  }
  
  try {
    console.log('Проверка подключения к Supabase...');
    
    // Устанавливаем тайм-аут в 8 секунд для запроса (увеличено с 5 секунд)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Тайм-аут при подключении к Supabase')), 8000)
    );
    
    // Пытаемся выполнить простой запрос к Supabase
    const queryPromise = supabase.from('groups').select('id').limit(1).then(({ data, error }) => {
      if (error) {
        throw new Error(`Ошибка при проверке подключения: ${error.message}`);
      }
      return true;
    });
    
    // Используем Promise.race для реализации тайм-аута
    return await Promise.race([queryPromise, timeoutPromise])
      .then(result => {
        console.log('Подключение к Supabase успешно!');
        return true;
      })
      .catch(error => {
        console.error('Ошибка при проверке подключения к Supabase:', error.message);
        return false;
      });
  } catch (error) {
    console.error('Непредвиденная ошибка при проверке подключения к Supabase:', error);
    return false;
  }
};

// Функция для обработки ошибок запросов к Supabase
export const handleSupabaseError = (error: any, fallbackData: any = null) => {
  if (error.message && error.message.includes('Failed to fetch')) {
    console.error('Ошибка сети при подключении к Supabase. Проверьте подключение к интернету или доступность Supabase.');
  } else if (error.message && error.message.includes('The operation was aborted')) {
    console.error('Операция была прервана из-за тайм-аута.');
  } else {
    console.error('Ошибка запроса к Supabase:', error);
  }
  return fallbackData;
};

// Функция для сохранения учетных данных Supabase в localStorage
export const saveSupabaseCredentials = (supabaseUrl: string, supabaseKey: string) => {
  try {
    localStorage.setItem('supabaseUrl', supabaseUrl);
    localStorage.setItem('supabaseKey', supabaseKey);
    console.log('Учетные данные Supabase сохранены в localStorage');
    // Обновляем переменные окружения для текущей сессии
    window.location.reload(); // Перезагружаем страницу для применения новых настроек
  } catch (error) {
    console.error('Ошибка при сохранении учетных данных Supabase:', error);
    throw new Error('Не удалось сохранить учетные данные Supabase');
  }
};

// Функция безопасного запроса к Supabase с автоматической обработкой ошибок и повторными попытками
export const safeSupabaseQuery = async <T>(
  queryFunction: () => Promise<{ data: T | null; error: any }>,
  fallbackData: T | null = null,
  retries = 2,
  retryDelay = 1000
): Promise<T | null> => {
  if (!supabase) {
    console.warn('Запрос невозможен: клиент Supabase не инициализирован');
    return fallbackData;
  }
  
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Попытка повторного запроса ${attempt} из ${retries}...`);
        // Увеличиваем задержку с каждой попыткой
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
      
      const { data, error } = await queryFunction();
      
      if (error) {
        console.error(`Ошибка при выполнении запроса (попытка ${attempt + 1}):`, error.message);
        lastError = error;
        // Если это не сетевая ошибка, прекращаем попытки
        if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
          break;
        }
      } else {
        return data;
      }
    } catch (error) {
      lastError = error;
      console.error(`Исключение при выполнении запроса (попытка ${attempt + 1}):`, error);
      
      // Если это не сетевая ошибка, прекращаем попытки
      if (!(error instanceof Error) || 
          (!error.message.includes('Failed to fetch') && 
           !error.message.includes('NetworkError') && 
           !error.message.includes('abort'))) {
        break;
      }
    }
  }
  
  return handleSupabaseError(lastError, fallbackData);
};

// Экспортируем клиент Supabase
export { supabase };