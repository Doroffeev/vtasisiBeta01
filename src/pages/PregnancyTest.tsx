import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Download, Upload, AlertTriangle, Calendar, Check, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useMovements } from '../contexts/MovementsContext';
import { useInsemination } from '../contexts/InseminationContext';
import { useUser } from '../contexts/UserContext';
import { format, differenceInDays } from 'date-fns';
import { saveAs } from 'file-saver';
import { usePlannedOperations } from '../contexts/PlannedOperationsContext';

interface PregnancyTest {
  id: string;
  date: string;
  animalId: string;
  animalNumber: string;
  result: 'positive' | 'negative';
  executorId: string;
  comments: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

const PregnancyTest: React.FC = () => {
  const { animals, updateAnimal } = useMovements();
  const { getUsersByRole } = useUser();
  const { getLatestInsemination } = useInsemination();
  const { scheduledOperations, completeOperation } = usePlannedOperations();
  
  const [tests, setTests] = useState<PregnancyTest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  
  // Состояние для связи с запланированной операцией
  const [scheduledOperationId, setScheduledOperationId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    animalId: '',
    result: 'positive' as 'positive' | 'negative',
    executorId: '',
    comments: ''
  });

  // Получаем активных ветеринаров
  const veterinarians = getUsersByRole('VET');

  // Фильтрация животных для выбора - только с последним осеменением
  const eligibleAnimals = animals.filter(animal => {
    const latestInsemination = getLatestInsemination(animal.id);
    return latestInsemination && animal.status !== 'Архив';
  });
  
  // Фильтрация запланированных операций типа PREGNANCY_TEST
  const pregnancyTestOperations = scheduledOperations.filter(
    op => !op.isCompleted && op.operationType === 'PREGNANCY_TEST'
  );

  // Обработка изменения полей формы
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Если меняется животное, проверяем наличие запланированной операции теста стельности
    if (name === 'animalId' && value) {
      const operation = pregnancyTestOperations.find(op => op.animalId === value);
      if (operation) {
        setScheduledOperationId(operation.id);
      } else {
        setScheduledOperationId(null);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Загрузка данных
  useEffect(() => {
    // Здесь должен быть запрос к API или Supabase для получения данных
    // Для примера используем локальное состояние
    setTests([
      {
        id: '1',
        date: '2024-05-01',
        animalId: '1',
        animalNumber: '0122',
        result: 'positive',
        executorId: '1',
        comments: 'Стандартный тест'
      },
      {
        id: '2',
        date: '2024-05-03',
        animalId: '2',
        animalNumber: '0123',
        result: 'negative',
        executorId: '1',
        comments: 'Требуется повторное осеменение'
      }
    ]);
  }, []);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Проверка наличия всех необходимых полей
      if (!formData.animalId || !formData.executorId) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }
      
      const animal = animals.find(a => a.id === formData.animalId);
      if (!animal) {
        throw new Error('Животное не найдено');
      }
      
      // Формируем новый тест
      const newTest: PregnancyTest = {
        id: crypto.randomUUID(),
        date: formData.date,
        animalId: formData.animalId,
        animalNumber: animal.number,
        result: formData.result,
        executorId: formData.executorId,
        comments: formData.comments
      };
      
      // Обновляем состояние локально
      setTests(prev => [...prev, newTest]);
      
      // Обновляем статус животного в зависимости от результата
      if (formData.result === 'positive') {
        // Если тест положительный, меняем статус на "Стел"
        await updateAnimal(formData.animalId, { 
          status: 'Стел',
          // Вычисляем ожидаемую дату отела (примерно через 285 дней от последнего осеменения)
          nextCalvingDate: format(
            new Date(
              new Date().setDate(new Date().getDate() + 285 - (animal.lastInseminationDate ? differenceInDays(new Date(), new Date(animal.lastInseminationDate)) : 0))
            ),
            'yyyy-MM-dd'
          )
        });
      } else {
        // Если тест отрицательный, меняем статус на "Ялов"
        await updateAnimal(formData.animalId, { status: 'Ялов' });
      }
      
      // Если тест связан с запланированной операцией, завершаем ее
      if (scheduledOperationId) {
        await completeOperation(
          scheduledOperationId, 
          formData.result === 'positive' ? 'POSITIVE' : 'NEGATIVE',
          formData.comments
        );
      }
      
      // Очищаем форму
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        animalId: '',
        result: 'positive',
        executorId: '',
        comments: ''
      });
      
      setShowForm(false);
    } catch (err) {
      setError(err.message || 'Произошла ошибка при добавлении теста');
      console.error('Ошибка при добавлении теста:', err);
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения информации о животном
  const getAnimalInfo = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.number : 'Неизвестно';
  };

  // Функция для получения информации об исполнителе
  const getExecutorInfo = (executorId: string) => {
    const executor = veterinarians.find(v => v.id === executorId);
    return executor ? executor.fullName : 'Неизвестно';
  };

  // Экспорт данных в TSV
  const handleExport = () => {
    const headers = ['Дата', 'Номер животного', 'Результат', 'Исполнитель', 'Комментарии'];
    
    const rows = tests.map(test => [
      test.date,
      test.animalNumber,
      test.result === 'positive' ? 'Положительный' : 'Отрицательный',
      getExecutorInfo(test.executorId),
      test.comments
    ]);
    
    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `pregnancy_tests_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };

  // Импорт данных из файла
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split('\n');
        
        // Пропускаем заголовок
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const [date, animalNumber, resultStr, executorName, comments] = lines[i].split('\t');
          
          // Находим ID животного по номеру
          const animal = animals.find(a => a.number === animalNumber);
          if (!animal) {
            console.warn(`Животное с номером ${animalNumber} не найдено`);
            continue;
          }
          
          // Находим ID исполнителя по имени
          const executor = veterinarians.find(v => v.fullName === executorName);
          if (!executor) {
            console.warn(`Исполнитель с именем ${executorName} не найден`);
            continue;
          }
          
          // Определяем результат
          const result = resultStr.toLowerCase().includes('пол') ? 'positive' : 'negative';
          
          // Создаем новый тест
          const newTest: PregnancyTest = {
            id: crypto.randomUUID(),
            date,
            animalId: animal.id,
            animalNumber,
            result,
            executorId: executor.id,
            comments: comments || ''
          };
          
          // Добавляем тест в список
          setTests(prev => [...prev, newTest]);
          
          // Обновляем статус животного
          await updateAnimal(animal.id, { 
            status: result === 'positive' ? 'Стел' : 'Ялов',
            // Вычисляем ожидаемую дату отела
            ...(result === 'positive' && {
              nextCalvingDate: format(
                new Date(
                  new Date().setDate(new Date().getDate() + 285 - (animal.lastInseminationDate ? differenceInDays(new Date(), new Date(animal.lastInseminationDate)) : 0))
                ),
                'yyyy-MM-dd'
              )
            })
          });
        }
        
        // Очищаем input file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (err) {
        setImportError('Ошибка при импорте данных. Проверьте формат файла.');
        console.error('Ошибка при импорте:', err);
      }
    };
    
    reader.readAsText(file);
  };

  // Обработчик удаления теста
  const handleDelete = () => {
    if (!testToDelete || !deleteReason.trim()) {
      return;
    }
    
    // Находим тест для удаления
    const testToDeleteObj = tests.find(t => t.id === testToDelete);
    if (!testToDeleteObj) return;
    
    // Помечаем тест как удаленный
    setTests(prev => prev.map(test => 
      test.id === testToDelete 
        ? {
            ...test,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            deletionReason: deleteReason
          }
        : test
    ));
    
    // Сбрасываем статус животного в зависимости от результата удаляемого теста
    const animal = animals.find(a => a.id === testToDeleteObj.animalId);
    if (animal) {
      // Если удаляем положительный тест, возвращаем статус "Осем"
      // Если удаляем отрицательный тест, оставляем статус "Ялов"
      if (testToDeleteObj.result === 'positive') {
        updateAnimal(animal.id, { 
          status: 'Осем',
          nextCalvingDate: '' // Очищаем дату ожидаемого отела
        });
      }
    }
    
    // Закрываем диалог
    setShowDeleteDialog(false);
    setTestToDelete(null);
    setDeleteReason('');
  };

  // Фильтрация тестов для отображения
  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      // Не показываем удаленные тесты
      if (test.isDeleted) return false;
      
      // Фильтрация по поисковому запросу
      return (
        test.animalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getExecutorInfo(test.executorId).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [tests, searchTerm]);

  // Пагинация
  const paginatedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTests.slice(startIndex, startIndex + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  // Общее количество страниц
  const totalPages = Math.ceil(filteredTests.length / pageSize);

  // Функции пагинации
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages || 1, prev + 1));
  };

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages || 1);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Тесты на стельность</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Upload size={20} className="mr-2" />
            Импорт
          </button>
          <button
            onClick={handleExport}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Download size={20} className="mr-2" />
            Экспорт
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить тест
          </button>
        </div>
      </div>

      {/* Показываем ошибки импорта */}
      {importError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{importError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления теста */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {scheduledOperationId 
                  ? 'Выполнить запланированный тест стельности' 
                  : 'Добавить тест на стельность'
                }
              </h2>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setScheduledOperationId(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            {scheduledOperationId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <Calendar className="text-blue-500 mr-2 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      Запланированная операция
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Результат будет автоматически зарегистрирован в плане репродукции
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Дата</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Животное</label>
                <select
                  name="animalId"
                  value={formData.animalId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите животное</option>
                  {eligibleAnimals.map(animal => {
                    // Проверяем, есть ли запланированный тест для этого животного
                    const hasScheduledTest = pregnancyTestOperations.some(op => op.animalId === animal.id);
                    
                    return (
                      <option key={animal.id} value={animal.id}>
                        {animal.number} {hasScheduledTest ? '(Запланирован)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Результат</label>
                <div className="mt-1 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="positive"
                      checked={formData.result === 'positive'}
                      onChange={() => setFormData(prev => ({ ...prev, result: 'positive' }))}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Положительный (стельная)</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="result"
                      value="negative"
                      checked={formData.result === 'negative'}
                      onChange={() => setFormData(prev => ({ ...prev, result: 'negative' }))}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Отрицательный (яловая)</span>
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Исполнитель</label>
                <select
                  name="executorId"
                  value={formData.executorId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите исполнителя</option>
                  {veterinarians.map(vet => (
                    <option key={vet.id} value={vet.id}>{vet.fullName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Комментарии</label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setScheduledOperationId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-600">Подтверждение удаления</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Вы уверены, что хотите удалить этот тест? Статус животного будет возвращен к предыдущему.
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Причина удаления</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Укажите причину удаления"
                rows={3}
                required
              ></textarea>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setTestToDelete(null);
                  setDeleteReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className={`px-4 py-2 rounded-md text-white ${
                  deleteReason.trim() 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!deleteReason.trim()}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по номеру животного..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Номер животного</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Результат</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исполнитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комментарии</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Нет данных о тестах на стельность
                  </td>
                </tr>
              ) : (
                paginatedTests.map(test => (
                  <tr key={test.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{test.animalNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        test.result === 'positive' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {test.result === 'positive' ? 'Положительный' : 'Отрицательный'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getExecutorInfo(test.executorId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{test.comments}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setTestToDelete(test.id);
                          setShowDeleteDialog(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Пагинация */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-2">
                Показать по
              </span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                {filteredTests.length > 0 ? 
                  `${Math.min((currentPage - 1) * pageSize + 1, filteredTests.length)} - ${Math.min(currentPage * pageSize, filteredTests.length)} из ${filteredTests.length}` : 
                  '0 записей'
                }
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1 || filteredTests.length === 0}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1 || filteredTests.length === 0}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || filteredTests.length === 0}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages || filteredTests.length === 0}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Секция запланированных тестов */}
      {pregnancyTestOperations.length > 0 && (
        <div className="bg-white shadow rounded-lg mt-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Запланированные тесты стельности</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Номер животного</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pregnancyTestOperations.map(operation => {
                  const animal = animals.find(a => a.id === operation.animalId);
                  
                  return (
                    <tr key={operation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operation.scheduledDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {animal ? animal.number : 'Неизвестно'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Запланирован
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            // Заполняем форму данными из запланированной операции
                            setFormData(prev => ({
                              ...prev,
                              date: format(new Date(), 'yyyy-MM-dd'),
                              animalId: operation.animalId,
                              result: 'positive'
                            }));
                            setScheduledOperationId(operation.id);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Выполнить
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PregnancyTest;