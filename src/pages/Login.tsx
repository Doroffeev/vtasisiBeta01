import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import Loader from '../components/Loader';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useUser();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(formData.username, formData.password);
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка при входе';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Ветеринарный ассистент
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            СПК "Большевик"
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Разработчик: Дорофеев И. В.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Логин
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                disabled={isLoading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Логин"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Пароль"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <Loader size="sm" color="white" />
                  <span className="ml-2">Вход...</span>
                </div>
              ) : 'Войти'}
            </button>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
            <p className="text-sm text-center text-gray-700 font-medium mb-2">
              Для входа используйте:
            </p>
            <p className="text-sm text-center text-gray-600">
              Администратор: <span className="font-medium">admin/admin</span>
            </p>
            <p className="text-sm text-center text-gray-600">
              Руководитель: <span className="font-medium">manager/manager</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;