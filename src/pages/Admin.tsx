import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, UserCheck, UserX, Download, Upload, Trash2, AlertTriangle, Database, FileUp, FileDown, UserMinus } from 'lucide-react';
import { useUser, UserRole } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import Loader from '../components/Loader';

// Список таблиц в базе данных для экспорта/импорта/очистки
const DATABASE_TABLES = [
  'users',
  'employees',
  'groups',
  'animals',
  'movements',
  'movement_animals',
  'nomenclature',
  'medications',
  'write_offs',
  'bulls',
  'inseminations',
  'calvings',
  'calving_logs',
  'buyers',
  'shipments',
  'shipment_animals',
  'shipment_logs',
  'action_logs'
];

// Таблицы, которые нельзя полностью очищать (будет сохранен минимальный набор данных)
const PRESERVED_TABLES = ['users'];

const Admin: React.FC = () => {
  const { currentUser, users, addUser, toggleUserStatus, hardDeleteUser } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Состояния для управления базой данных
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dbOperationResult, setDbOperationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
  }>({ status: null, message: '' });
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'database'>('users');

  // Состояния для управления удалением пользователя
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const importFileRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'VET' as UserRole
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await addUser({
        username: formData.username,
        fullName: formData.fullName,
        role: formData.role,
        isActive: true
      });

      setShowForm(false);
      setFormData({
        username: '',
        fullName: '',
        password: '',
        role: 'VET'
      });
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Произошла ошибка при добавлении пользователя');
      }
    }
  };

  // Функция для экспорта базы данных
  const exportDatabase = async () => {
    try {
      setIsProcessing(true);
      setDbOperationResult({ status: null, message: '' });

      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован. Невозможно экспортировать базу данных.');
      }

      // Объект для хранения данных из всех таблиц
      const databaseData: Record<string, any[]> = {};
      
      // Получаем данные из всех таблиц
      for (const table of DATABASE_TABLES) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            console.warn(`Ошибка при экспорте таблицы ${table}:`, error.message);
            databaseData[table] = [];
          } else {
            databaseData[table] = data || [];
            console.log(`Экспортировано ${data?.length || 0} записей из таблицы ${table}`);
          }
        } catch (err) {
          console.error(`Ошибка при экспорте таблицы ${table}:`, err);
          databaseData[table] = [];
        }
      }

      // Добавляем метаданные экспорта
      const exportData = {
        metadata: {
          version: '1.0',
          exportDate: new Date().toISOString(),
          exportedBy: currentUser?.username || 'unknown',
          tables: Object.keys(databaseData),
          recordCounts: Object.fromEntries(
            Object.entries(databaseData).map(([table, data]) => [table, data.length])
          )
        },
        data: databaseData
      };

      // Создаем файл для скачивания
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `database_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setDbOperationResult({ 
        status: 'success', 
        message: `База данных успешно экспортирована. Всего таблиц: ${Object.keys(databaseData).length}` 
      });
    } catch (error) {
      console.error('Ошибка при экспорте базы данных:', error);
      setDbOperationResult({ 
        status: 'error', 
        message: `Ошибка при экспорте базы данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      });
    } finally {
      setIsProcessing(false);
      setShowExportConfirm(false);
    }
  };

  // Функция для импорта базы данных
  const importDatabase = async () => {
    try {
      setIsProcessing(true);
      setDbOperationResult({ status: null, message: '' });

      if (!importFile) {
        throw new Error('Файл не выбран');
      }

      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован. Невозможно импортировать базу данных.');
      }

      // Чтение содержимого файла
      const reader = new FileReader();
      
      const fileContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const content = e.target?.result;
          if (typeof content === 'string') {
            resolve(content);
          } else {
            reject(new Error('Не удалось прочитать файл'));
          }
        };
        reader.onerror = () => reject(new Error('Ошибка при чтении файла'));
        reader.readAsText(importFile);
      });

      // Парсинг JSON-данных
      let importData;
      try {
        importData = JSON.parse(fileContent);
      } catch (e) {
        throw new Error('Не удалось распарсить JSON. Файл имеет неверный формат.');
      }

      // Проверка структуры файла
      if (!importData.metadata || !importData.data) {
        throw new Error('Неверный формат файла импорта. Отсутствуют необходимые разделы.');
      }

      // Проверка версии
      if (importData.metadata.version !== '1.0') {
        console.warn('Внимание: версия файла импорта может быть несовместима с текущей версией системы.');
      }

      // Импорт данных по таблицам
      const results: Record<string, { success: boolean; count: number; error?: string }> = {};
      
      // Определяем порядок импорта таблиц с учетом зависимостей
      const importOrder = [
        'users',
        'employees',
        'groups',
        'nomenclature',
        'medications',
        'write_offs',
        'bulls',
        'animals',
        'movements',
        'movement_animals',
        'inseminations',
        'buyers',
        'shipments',
        'shipment_animals',
        'shipment_logs',
        'calvings',
        'calving_logs',
        'action_logs'
      ];

      for (const table of importOrder) {
        if (!importData.data[table] || !Array.isArray(importData.data[table])) {
          console.warn(`Таблица ${table} отсутствует в импортируемых данных или имеет неверный формат.`);
          results[table] = { success: false, count: 0, error: 'Отсутствует в импорте' };
          continue;
        }

        const tableData = importData.data[table];
        
        if (tableData.length === 0) {
          console.log(`Таблица ${table} пуста, пропускаем.`);
          results[table] = { success: true, count: 0 };
          continue;
        }

        try {
          // Сначала удаляем существующие данные в таблице
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Условие, чтобы не удалять все строки
          
          if (deleteError && !deleteError.message.includes('no rows')) {
            console.warn(`Ошибка при очистке таблицы ${table}:`, deleteError.message);
          }

          // Вставляем новые данные
          const { error: insertError } = await supabase
            .from(table)
            .insert(tableData);

          if (insertError) {
            console.error(`Ошибка при импорте данных в таблицу ${table}:`, insertError.message);
            results[table] = { success: false, count: 0, error: insertError.message };
          } else {
            console.log(`Импортировано ${tableData.length} записей в таблицу ${table}`);
            results[table] = { success: true, count: tableData.length };
          }
        } catch (error) {
          console.error(`Ошибка при импорте таблицы ${table}:`, error);
          results[table] = { success: false, count: 0, error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
        }
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      setDbOperationResult({ 
        status: successCount === totalCount ? 'success' : 'error', 
        message: `Импорт завершен. Успешно: ${successCount}/${totalCount} таблиц.` 
      });
    } catch (error) {
      console.error('Ошибка при импорте базы данных:', error);
      setDbOperationResult({ 
        status: 'error', 
        message: `Ошибка при импорте базы данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      });
    } finally {
      setIsProcessing(false);
      setShowImportConfirm(false);
      setImportFile(null);
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
    }
  };

  // Функция для очистки базы данных
  const clearDatabase = async () => {
    try {
      setIsProcessing(true);
      setDbOperationResult({ status: null, message: '' });

      if (clearConfirmText !== 'УДАЛИТЬ') {
        throw new Error('Неверное подтверждение. Очистка базы данных отменена.');
      }

      if (!supabase) {
        throw new Error('Supabase клиент не инициализирован. Невозможно очистить базу данных.');
      }

      // Сохраняем учетные данные администратора перед очисткой
      let adminUser = null;
      if (currentUser?.role === 'ADMIN') {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        adminUser = data;
      }

      // Очищаем таблицы в обратном порядке (с учётом зависимостей)
      const results: Record<string, { success: boolean; error?: string }> = {};
      
      // Определяем порядок удаления с учетом внешних ключей
      const deleteOrder = [
        'calving_logs',
        'shipment_logs',
        'action_logs',
        'write_offs',
        'medication_usages',
        'operation_comments',
        'planned_operations',
        'shipment_animals',
        'movement_animals',
        'treatment_step_medications',
        'completed_steps',
        'missed_steps',
        'treatment_steps',
        'active_treatments',
        'calvings',
        'inseminations',
        'shipments',
        'vet_operations',
        'animals',
        'medications',
        'bulls',
        'buyers',
        'treatment_schemes',
        'groups',
        'employees',
        'nomenclature'
      ];

      // Не очищаем таблицу users, чтобы сохранить учетные записи
      const tablesToClear = deleteOrder.filter(table => !PRESERVED_TABLES.includes(table));

      for (const table of tablesToClear) {
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');  // Условие для защиты от удаления всех записей
          
          // Игнорируем ошибки "no rows", они означают, что таблица уже пуста
          if (error && !error.message.includes('no rows')) {
            console.error(`Ошибка при очистке таблицы ${table}:`, error.message);
            results[table] = { success: false, error: error.message };
          } else {
            console.log(`Таблица ${table} успешно очищена`);
            results[table] = { success: true };
          }
        } catch (error) {
          console.error(`Ошибка при очистке таблицы ${table}:`, error);
          results[table] = { success: false, error: error instanceof Error ? error.message : 'Неизвестная ошибка' };
        }
      }

      // Восстанавливаем учетную запись администратора, если была сохранена
      if (adminUser && PRESERVED_TABLES.includes('users')) {
        await supabase
          .from('users')
          .upsert([adminUser]);
      }

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      setDbOperationResult({ 
        status: 'success', 
        message: `База данных очищена. Успешно: ${successCount}/${totalCount} таблиц.` 
      });
    } catch (error) {
      console.error('Ошибка при очистке базы данных:', error);
      setDbOperationResult({ 
        status: 'error', 
        message: `Ошибка при очистке базы данных: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` 
      });
    } finally {
      setIsProcessing(false);
      setShowClearConfirm(false);
      setClearConfirmText('');
    }
  };

  // Функция для полного удаления пользователя
  const handleHardDeleteUser = async () => {
    try {
      if (!userToDelete) return;
      
      if (deleteConfirmText !== 'УДАЛИТЬ') {
        setFormError('Неверное подтверждение. Введите "УДАЛИТЬ" для подтверждения операции.');
        return;
      }

      await hardDeleteUser(userToDelete);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      setDeleteConfirmText('');
      setFormError(null);
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError('Произошла ошибка при удалении пользователя');
      }
    }
  };

  // Открытие модального окна удаления
  const openDeleteModal = (userId: string) => {
    // Проверяем, не пытается ли пользователь удалить себя
    if (currentUser?.id === userId) {
      setFormError('Невозможно удалить текущего пользователя');
      return;
    }

    // Проверяем, является ли пользователь администратором
    if (currentUser?.role !== 'ADMIN') {
      setFormError('Только администратор может полностью удалить пользователя');
      return;
    }

    setUserToDelete(userId);
    setDeleteConfirmText('');
    setShowDeleteConfirm(true);
  };

  // Обработчик выбора файла для импорта
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  // Фильтрация пользователей по поисковому запросу
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Руководитель',
    VET: 'Ветврач',
    ZOOTECHNICIAN: 'Зоотехник',
    CARETAKER: 'Телятница',
    INSEMINATOR: 'Осеминатор'
  };

  // Проверка, является ли пользователь администратором
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Администрирование</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex border-b pb-4 mb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md mr-2 transition-colors ${
              activeTab === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Управление пользователями
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              activeTab === 'database' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database size={18} className="mr-2" />
            Управление базой данных
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Пользователи системы</h2>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center transition-colors"
              >
                <Plus size={20} className="mr-2" />
                Добавить пользователя
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Поиск по логину, ФИО..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </div>
            </div>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md border border-red-200 flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0" />
                <p>{formError}</p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Логин</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ФИО</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Роль</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{roleLabels[user.role]}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 space-x-2 flex items-center">
                        {/* Не даем изменять себя самому */}
                        {currentUser?.id !== user.id && (
                          <>
                            <button
                              onClick={() => toggleUserStatus(user.id)}
                              className={`p-1.5 rounded ${
                                user.isActive 
                                  ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              } transition-colors`}
                              title={user.isActive ? 'Заблокировать' : 'Активировать'}
                            >
                              {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                            </button>
                            
                            {/* Полное удаление пользователя (только для администраторов) */}
                            {isAdmin && (
                              <button
                                onClick={() => openDeleteModal(user.id)}
                                className="p-1.5 rounded text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                                title="Полностью удалить пользователя"
                              >
                                <UserMinus size={18} />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Управление базой данных</h2>
              
              {dbOperationResult.status && (
                <div className={`mb-4 p-4 rounded-md ${
                  dbOperationResult.status === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <p>{dbOperationResult.message}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                  <div className="flex flex-col h-full">
                    <div className="mb-4 flex items-center">
                      <FileDown className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium">Экспорт базы данных</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                      Создание резервной копии всех данных системы в формате JSON. 
                      Файл можно будет использовать для последующего восстановления.
                    </p>
                    <button
                      onClick={() => setShowExportConfirm(true)}
                      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 mt-auto transition-colors"
                    >
                      Экспортировать базу данных
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                  <div className="flex flex-col h-full">
                    <div className="mb-4 flex items-center">
                      <FileUp className="h-6 w-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium">Импорт базы данных</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                      Восстановление данных из ранее созданной резервной копии.
                      Внимание: текущие данные будут заменены!
                    </p>
                    <input 
                      type="file" 
                      ref={importFileRef}
                      className="hidden" 
                      accept=".json"
                      onChange={handleFileSelect}
                    />
                    <button
                      onClick={() => importFileRef.current?.click()}
                      className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 mt-auto transition-colors"
                    >
                      Выбрать файл для импорта
                    </button>
                    {importFile && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600">Выбран файл: {importFile.name}</p>
                        <button
                          onClick={() => setShowImportConfirm(true)}
                          className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 mt-2 transition-colors"
                        >
                          Импортировать данные
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                  <div className="flex flex-col h-full">
                    <div className="mb-4 flex items-center">
                      <Trash2 className="h-6 w-6 text-red-600 mr-2" />
                      <h3 className="text-lg font-medium">Очистка базы данных</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 flex-grow">
                      Удаление всех данных из системы с сохранением учетной записи администратора.
                      Внимание: действие необратимо!
                    </p>
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 mt-auto transition-colors"
                    >
                      Очистить базу данных
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Добавить пользователя</h2>
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {formError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Логин</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ФИО</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Пароль</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Роль</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                  required
                >
                  <option value="ADMIN">Администратор</option>
                  <option value="MANAGER">Руководитель</option>
                  <option value="VET">Ветврач</option>
                  <option value="ZOOTECHNICIAN">Зоотехник</option>
                  <option value="CARETAKER">Телятница</option>
                  <option value="INSEMINATOR">Осеминатор</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения полного удаления пользователя */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Полное удаление пользователя</h2>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-base font-medium text-yellow-800">Внимание!</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Вы собираетесь <strong>полностью удалить пользователя из системы</strong>. 
                    Это действие <strong>невозможно отменить</strong>, и все связанные данные будут модифицированы.
                  </p>
                  <p className="mt-2 text-sm text-yellow-700">
                    Чтобы просто деактивировать пользователя, используйте кнопку "Заблокировать" вместо удаления.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Для подтверждения введите слово "УДАЛИТЬ"
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 transition-colors"
                placeholder="Введите УДАЛИТЬ"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                  setDeleteConfirmText('');
                  setFormError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleHardDeleteUser}
                disabled={deleteConfirmText !== 'УДАЛИТЬ'}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors ${
                  deleteConfirmText !== 'УДАЛИТЬ' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Удалить навсегда
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения экспорта */}
      {showExportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Экспорт базы данных</h2>
            <p className="mb-4 text-gray-700">
              Вы собираетесь создать резервную копию всех данных системы. Это действие не изменит текущие данные.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowExportConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={exportDatabase}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader size="sm" color="white" />
                    <span className="ml-2">Экспорт...</span>
                  </>
                ) : 'Экспортировать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения импорта */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Импорт базы данных</h2>
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-600">Внимание!</h3>
                <p className="mt-2 text-gray-600">
                  При импорте все существующие данные будут заменены данными из файла. 
                  Это действие невозможно отменить. 
                </p>
                <p className="mt-2 text-gray-600">
                  Рекомендуется создать резервную копию перед импортом.
                </p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Выбранный файл: <span className="font-medium">{importFile?.name}</span>
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowImportConfirm(false)}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={importDatabase}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
              >
                {isProcessing ? (
                  <>
                    <Loader size="sm" color="white" />
                    <span className="ml-2">Импорт...</span>
                  </>
                ) : 'Импортировать данные'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения очистки базы данных */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Очистка базы данных</h2>
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-600">Опасное действие!</h3>
                <p className="mt-2 text-gray-600">
                  Вы собираетесь удалить ВСЕ данные из базы данных. Будут сохранены только 
                  минимальные настройки системы и учетная запись администратора.
                </p>
                <p className="mt-2 font-semibold text-red-600">
                  Это действие невозможно отменить!
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Для подтверждения введите слово "УДАЛИТЬ"
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 transition-colors"
                placeholder="Введите УДАЛИТЬ"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText('');
                }}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={clearDatabase}
                disabled={isProcessing || clearConfirmText !== 'УДАЛИТЬ'}
                className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center transition-colors ${
                  clearConfirmText !== 'УДАЛИТЬ' ? 'cursor-not-allowed' : ''
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader size="sm" color="white" />
                    <span className="ml-2">Очистка...</span>
                  </>
                ) : 'Очистить базу данных'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;