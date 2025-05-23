import React, { useState } from 'react';
import { saveSupabaseCredentials, checkSupabaseConnection } from '../lib/supabase';
import Loader from './Loader';

interface SupabaseSetupProps {
  onSuccess: () => void;
}

const SupabaseSetup: React.FC<SupabaseSetupProps> = ({ onSuccess }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'input' | 'testing'>('input');

  const validateUrl = (url: string): boolean => {
    return url.startsWith('https://') && url.includes('.supabase.co');
  };

  const validateKey = (key: string): boolean => {
    return key.startsWith('eyJ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Пожалуйста, заполните оба поля');
      return;
    }
    
    // Проверка формата URL
    if (!validateUrl(supabaseUrl)) {
      setError('Неверный формат URL Supabase. URL должен начинаться с https:// и содержать .supabase.co');
      return;
    }

    // Проверка формата ключа
    if (!validateKey(supabaseKey)) {
      setError('Неверный формат Anon Key. Ключ должен начинаться с "eyJ"');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('testing');
    
    try {
      // Сохраняем учетные данные
      saveSupabaseCredentials(supabaseUrl, supabaseKey);
      
      // Проверяем подключение (здесь будет задержка до перезагрузки страницы из saveSupabaseCredentials)
      const isConnected = await checkSupabaseConnection();
      
      if (!isConnected) {
        throw new Error('Не удалось подключиться к Supabase с указанными учетными данными');
      }
      
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при сохранении настроек';
      setError(errorMessage);
      setIsSubmitting(false);
      setCurrentStep('input');
    }
  };

  if (currentStep === 'testing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Проверка подключения</h2>
          
          <div className="flex flex-col items-center justify-center py-6">
            <Loader size="lg" color="primary" />
            <p className="mt-6 text-gray-600">
              Проверка подключения к Supabase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Настройка Supabase</h2>
        
        <p className="text-gray-600 mb-6">
          Для работы приложения необходимо указать URL и Anon Key вашего проекта Supabase.
          Вы можете найти эти данные в настройках вашего проекта Supabase в разделе API.
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200 flex items-start">
            <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Supabase URL
            </label>
            <input
              id="supabaseUrl"
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Например: https://abcdefghijklm.supabase.co
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="supabaseKey" className="block text-sm font-medium text-gray-700 mb-1">
              Supabase Anon Key
            </label>
            <input
              id="supabaseKey"
              type="text"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="your-anon-key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Ключ будет начинаться с "eyJ..."
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить и подключиться'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-sm text-gray-500 mb-2">
            <p>
              Эти данные будут сохранены в локальном хранилище вашего браузера.
              Вы можете изменить их в любое время.
            </p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Как получить данные для подключения</h3>
            <ol className="text-xs text-blue-700 list-decimal pl-5 space-y-1">
              <li>Войдите в <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800 transition-colors">Supabase</a></li>
              <li>Создайте новый проект или выберите существующий</li>
              <li>В панели управления перейдите в раздел "Settings" → "API"</li>
              <li>Скопируйте "URL" и "anon/public" ключ</li>
              <li>Вставьте их в соответствующие поля выше</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSetup;