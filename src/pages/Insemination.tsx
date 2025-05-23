import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Download, Upload, Trash2, X, AlertTriangle, FileText, Printer, Calendar, Filter } from 'lucide-react';
import { useInsemination, Bull } from '../contexts/InseminationContext';
import { useMovements } from '../contexts/MovementsContext';
import { useUser, UserRole } from '../contexts/UserContext';
import { format, differenceInDays, isWithinInterval, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';
import SearchableSelect from '../components/ui/SearchableSelect';

interface WriteOffFormData {
  bullId: string;
  quantity: number;
  reason: string;
}

const Insemination: React.FC = () => {
  const { 
    bulls, 
    inseminations,
    isLoading,
    error: contextError,
    addBull, 
    deleteBull,
    addInsemination,
    deleteInsemination,
    getBullById,
    updateBull
  } = useInsemination();

  const { animals, updateAnimalInsemination, updateAnimalStatus } = useMovements();
  const { getUsersByRole, currentUser } = useUser();
  
  const [showForm, setShowForm] = useState(false);
  const [showBullForm, setShowBullForm] = useState(false);
  const [showWriteOffForm, setShowWriteOffForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [animalNumbers, setAnimalNumbers] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [writeOffData, setWriteOffData] = useState<WriteOffFormData>({
    bullId: '',
    quantity: 0,
    reason: ''
  });
  const [selectedInseminationId, setSelectedInseminationId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для предупреждения о статусе "Архив"
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAnimalNumber, setArchiveAnimalNumber] = useState('');

  // Состояние для фильтров отчета
  const [reportFilters, setReportFilters] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    animalNumber: '',
    bullCode: '',
    executorId: '',
    status: ''
  });

  // Получаем пользователей с ролью INSEMINATOR для выбора исполнителя
  const inseminators = getUsersByRole('INSEMINATOR');

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    animalId: '',
    bullId: '',
    executorId: '',
    status: 'ОСЕМ' as const
  });

  const [newBull, setNewBull] = useState<Omit<Bull, 'id'>>({
    code: '',
    name: '',
    price: 0,
    remainingDoses: 0
  });

  // Отображаем ошибки из контекста, если они есть
  useEffect(() => {
    if (contextError) {
      setError(contextError);
    }
  }, [contextError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReportFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAnimalNumbersChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnimalNumbers(value);

    // Parse numbers and update selection
    const numbers = value.split(/[,.\n]/).map(n => n.trim()).filter(Boolean);
    const validAnimals = animals.filter(animal => numbers.includes(animal.number));
    setSelectedAnimals(validAnimals.map(animal => animal.id));
  };

  const handleBullInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBull(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'remainingDoses' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get all selected animals (both from dropdown and text input)
    const selectedAnimalIds = new Set([
      ...(formData.animalId ? [formData.animalId] : []),
      ...selectedAnimals
    ]);

    // Validate required fields
    if (!formData.bullId || !formData.executorId || selectedAnimalIds.size === 0) {
      setError('Необходимо заполнить все обязательные поля');
      return; // Don't proceed if required fields are missing
    }

    // Проверяем, есть ли среди выбранных животных архивные
    const archiveAnimal = animals.find(
      animal => selectedAnimalIds.has(animal.id) && animal.status === 'Архив'
    );
    
    if (archiveAnimal) {
      setArchiveAnimalNumber(archiveAnimal.number);
      setShowArchiveWarning(true);
      return;
    }

    // Проверяем достаточно ли доз семени для всех выбранных животных
    const bull = getBullById(formData.bullId);
    if (!bull) {
      setError('Выбранный бык не найден');
      return;
    }
    
    // Проверяем, хватает ли доз на всех выбранных животных
    if (bull.remainingDoses < selectedAnimalIds.size) {
      setError(`Недостаточно доз семени (доступно ${bull.remainingDoses}, требуется ${selectedAnimalIds.size})`);
      return;
    }
    
    // Проверяем, существует ли выбранный исполнитель
    const executorExists = inseminators.some(ins => ins.id === formData.executorId);
    if (!executorExists) {
      setError('Выбранный исполнитель не найден. Пожалуйста, выберите другого исполнителя.');
      return;
    }

    // Уменьшаем количество доз у быка сразу на количество выбранных животных
    if (bull && bull.remainingDoses >= selectedAnimalIds.size) {
      // Обновляем локальное состояние
      updateBull(bull.id, {
        remainingDoses: bull.remainingDoses - selectedAnimalIds.size
      });
    }

    // Create an insemination record for each selected animal
    selectedAnimalIds.forEach(async (animalId) => {
      try {
        // Add insemination record
        const result = await addInsemination({
          date: formData.date,
          time: format(new Date(), 'HH:mm'),
          animalId,
          bullId: formData.bullId,
          executorId: formData.executorId,
          status: 'ОСЕМ'
        });
        
        if (result) {
          // Update animal's status and insemination date only if successful
          updateAnimalInsemination(animalId, formData.date);
        }
      } catch (err) {
        console.error('Ошибка при добавлении осеменения:', err);
        setError(`Ошибка при добавлении осеменения: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      }
    });

    // Reset form
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      animalId: '',
      bullId: '',
      executorId: '',
      status: 'ОСЕМ'
    });
    setAnimalNumbers('');
    setSelectedAnimals([]);
    setShowForm(false);
  };

  const handleBullSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBull(newBull);
    setNewBull({
      code: '',
      name: '',
      price: 0,
      remainingDoses: 0
    });
    setShowBullForm(false);
  };

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInseminationId) {
      setError('Выбранное осеменение не найдено');
      return;
    }
    
    if (!deletionReason.trim()) {
      setError('Необходимо указать причину удаления');
      return;
    }
    
    const insemination = inseminations.find(i => i.id === selectedInseminationId);
    if (insemination) {
      // Удаляем осеменение (фактически помечаем как удаленное)
      deleteInsemination(selectedInseminationId, deletionReason)
        .then(() => {
          // Возвращаем животному статус "Без"
          updateAnimalStatus(insemination.animalId, 'Без');
          // Закрываем модальное окно
          setShowDeleteForm(false);
          setSelectedInseminationId(null);
          setDeletionReason('');
        })
        .catch(err => {
          setError('Ошибка при удалении осеменения: ' + err.message);
        });
    }
  };

  const handleDeleteClick = (inseminationId: string) => {
    setSelectedInseminationId(inseminationId);
    setDeletionReason('');
    setShowDeleteForm(true);
  };

  const handleExport = () => {
    const headers = ['Дата', 'Время', '№ животного', 'Бык', 'Исполнитель', 'Статус', 'Удалено'];
    const rows = inseminations.map(insemination => {
      const animal = animals.find(a => a.id === insemination.animalId);
      return [
        insemination.date,
        insemination.time,
        animal?.number || '',
        getBullById(insemination.bullId)?.code || '',
        inseminators.find(e => e.id === insemination.executorId)?.fullName || '',
        insemination.status,
        insemination.isDeleted ? 'Да' : 'Нет'
      ];
    });

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `inseminations_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      
      // Skip header row
      const dataRows = lines.slice(1);
      
      dataRows.forEach(row => {
        const [date, time, animalNumber, bullCode, executorName, status] = row.split('\t');
        const animal = animals.find(a => a.number === animalNumber);
        const bull = bulls.find(b => b.code === bullCode);
        const executor = inseminators.find(e => e.fullName === executorName);
        
        if (animal && bull && executor) {
          addInsemination({
            date,
            time,
            animalId: animal.id,
            bullId: bull.id,
            executorId: executor.id,
            status: status as 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ'
          });
          
          // Обновляем статус животного
          updateAnimalInsemination(animal.id, date);
        }
      });
    };
    
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBullDelete = (bull: Bull) => {
    if (bull.remainingDoses > 0) {
      alert('Невозможно удалить быка с остатком доз. Сначала необходимо списать все дозы.');
      return;
    }
    deleteBull(bull.id);
  };

  const handleWriteOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bull = bulls.find(b => b.id === writeOffData.bullId);
    
    if (!bull) return;
    
    if (writeOffData.quantity > bull.remainingDoses) {
      alert('Количество списания не может превышать остаток доз');
      return;
    }

    if (!writeOffData.reason.trim()) {
      alert('Необходимо указать причину списания');
      return;
    }

    // Update bull's remaining doses
    updateBull(bull.id, {
      ...bull,
      remainingDoses: bull.remainingDoses - writeOffData.quantity
    });

    // Reset form and close modal
    setWriteOffData({
      bullId: '',
      quantity: 0,
      reason: ''
    });
    setShowWriteOffForm(false);
  };

  // Функция для генерации отчета
  const generateReport = () => {
    setShowReportPreview(true);
  };

  // Функция для печати отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };

  // Функция для фильтрации осеменений по заданным критериям
  const getFilteredInseminations = () => {
    return inseminations.filter(insemination => {
      // Фильтр по дате
      const insemDate = new Date(insemination.date);
      const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : new Date(0);
      const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : new Date();
      
      const dateInRange = insemDate >= startDate && insemDate <= endDate;
      
      // Фильтр по номеру животного
      const animal = animals.find(a => a.id === insemination.animalId);
      const matchesAnimal = !reportFilters.animalNumber || 
        (animal && animal.number.includes(reportFilters.animalNumber));
      
      // Фильтр по коду быка
      const bull = getBullById(insemination.bullId);
      const matchesBull = !reportFilters.bullCode || 
        (bull && bull.code.includes(reportFilters.bullCode));
      
      // Фильтр по исполнителю
      const matchesExecutor = !reportFilters.executorId || 
        insemination.executorId === reportFilters.executorId;
      
      // Фильтр по статусу
      const matchesStatus = !reportFilters.status || 
        insemination.status === reportFilters.status;
      
      return dateInRange && matchesAnimal && matchesBull && matchesExecutor && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Генерация HTML для печати отчета
  const generateReportHTML = () => {
    const filteredInseminations = getFilteredInseminations();
    
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по осеменениям</title>
        <style>
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 20px;
          }
          .report-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .report-date {
            font-size: 14px;
            margin-bottom: 20px;
          }
          .filters-info {
            font-size: 12px;
            margin-bottom: 15px;
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #f9f9f9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
          }
          .signature-line {
            border-top: 1px solid #000;
            width: 200px;
            margin-top: 30px;
            text-align: center;
          }
          @media print {
            button { 
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">ОТЧЕТ ПО ОСЕМЕНЕНИЯМ</div>
          <div class="report-date">по состоянию на ${format(new Date(), 'dd.MM.yyyy')}</div>
        </div>
        
        <div class="filters-info">
          <strong>Примененные фильтры:</strong><br>
          Период: ${reportFilters.startDate} - ${reportFilters.endDate}<br>
          ${reportFilters.animalNumber ? `Номер животного: ${reportFilters.animalNumber}<br>` : ''}
          ${reportFilters.bullCode ? `Код быка: ${reportFilters.bullCode}<br>` : ''}
          ${reportFilters.executorId ? `Исполнитель: ${inseminators.find(i => i.id === reportFilters.executorId)?.fullName || ''}<br>` : ''}
          ${reportFilters.status ? `Статус: ${reportFilters.status}<br>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Время</th>
              <th>№ животного</th>
              <th>Бык</th>
              <th>Исполнитель</th>
              <th>Статус</th>
              <th>Дней</th>
            </tr>
          </thead>
          <tbody>
            ${filteredInseminations.map((insemination, index) => {
              const animal = animals.find(a => a.id === insemination.animalId);
              const bull = getBullById(insemination.bullId);
              const executor = inseminators.find(e => e.id === insemination.executorId);
              const daysFromInsemination = differenceInDays(
                new Date(),
                new Date(insemination.date)
              );
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${insemination.date}</td>
                  <td>${insemination.time}</td>
                  <td>${animal?.number || ''}</td>
                  <td>${bull?.code || ''}</td>
                  <td>${executor?.fullName || ''}</td>
                  <td>${insemination.status}</td>
                  <td>${daysFromInsemination}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="signatures">
          <div>
            <p>Ответственный за осеменение:</p>
            <div class="signature-line">Подпись</div>
          </div>
          <div>
            <p>Утверждено:</p>
            <div class="signature-line">Подпись</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Печать отчета</button>
        </div>
      </body>
      </html>
    `;
  };

  // Calculate if form is valid
  const isFormValid = Boolean(
    formData.date && 
    formData.bullId && 
    formData.executorId && 
    (formData.animalId || selectedAnimals.length > 0)
  );

  // Фильтрация осеменений - исключаем удаленные для отображения
  const displayInseminations = inseminations;

  // Отображение индикатора загрузки
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Осеменение</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".txt"
            className="hidden"
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
            onClick={() => setShowReportForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => setShowBullForm(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить быка
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить осеменение
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предупреждения о статусе "Архив" */}
      {showArchiveWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-600">Предупреждение</h3>
                <p className="mt-2 text-gray-600">
                  Животное №{archiveAnimalNumber} имеет статус "Архив". 
                  Действия запрещены, измените статус!
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowArchiveWarning(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно формирования отчета */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Формирование отчета по осеменениям</h2>
              <button
                onClick={() => setShowReportForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата начала</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="startDate"
                      value={reportFilters.startDate}
                      onChange={handleReportFilterChange}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата окончания</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="endDate"
                      value={reportFilters.endDate}
                      onChange={handleReportFilterChange}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Номер животного</label>
                  <input
                    type="text"
                    name="animalNumber"
                    value={reportFilters.animalNumber}
                    onChange={handleReportFilterChange}
                    placeholder="Введите номер животного"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Код быка</label>
                  <input
                    type="text"
                    name="bullCode"
                    value={reportFilters.bullCode}
                    onChange={handleReportFilterChange}
                    placeholder="Введите код быка"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Исполнитель</label>
                  <select
                    name="executorId"
                    value={reportFilters.executorId}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Все исполнители</option>
                    {inseminators.map(inseminator => (
                      <option key={inseminator.id} value={inseminator.id}>
                        {inseminator.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <select
                    name="status"
                    value={reportFilters.status}
                    onChange={handleReportFilterChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Все статусы</option>
                    <option value="ОСЕМ">ОСЕМ</option>
                    <option value="СТЕЛ">СТЕЛ</option>
                    <option value="ЯЛОВАЯ">ЯЛОВАЯ</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Найдено записей: {getFilteredInseminations().length}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReportFilters({
                        startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
                        endDate: format(new Date(), 'yyyy-MM-dd'),
                        animalNumber: '',
                        bullCode: '',
                        executorId: '',
                        status: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Сбросить фильтры
                  </button>
                  <button
                    type="button"
                    onClick={generateReport}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Сформировать отчет
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предварительного просмотра отчета */}
      {showReportPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Предварительный просмотр отчета</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrintReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Printer size={20} className="mr-2" />
                  Печать
                </button>
                <button
                  onClick={() => setShowReportPreview(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto bg-gray-50 p-4">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Отчет по осеменениям"
              />
            </div>
          </div>
        </div>
      )}

      {showBullForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Добавить быка-осеменителя</h2>
            <form onSubmit={handleBullSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Код</label>
                <input
                  type="text"
                  name="code"
                  value={newBull.code}
                  onChange={handleBullInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Имя</label>
                <input
                  type="text"
                  name="name"
                  value={newBull.name}
                  onChange={handleBullInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Цена дозы</label>
                <input
                  type="number"
                  name="price"
                  value={newBull.price}
                  onChange={handleBullInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Количество доз</label>
                <input
                  type="number"
                  name="remainingDoses"
                  value={newBull.remainingDoses}
                  onChange={handleBullInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBullForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Добавить осеменение</h2>
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
                <label className="block text-sm font-medium text-gray-700">Выберите животных из списка</label>
                <select
                  name="animalId"
                  value={formData.animalId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Выберите животное</option>
                  {animals
                    .filter(animal => animal.status !== 'Архив') // Исключаем животных со статусом "Архив"
                    .map(animal => (
                      <option key={animal.id} value={animal.id}>
                        {animal.number}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Или введите номера животных (через запятую, точку или новую строку)
                </label>
                <textarea
                  value={animalNumbers}
                  onChange={handleAnimalNumbersChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Например: 1122,1124,1125 или 1122.1124.1125"
                />
              </div>

              {selectedAnimals.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Выбранные животные:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAnimals.map(id => {
                      const animal = animals.find(a => a.id === id);
                      return animal ? (
                        <span
                          key={id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {animal.number}
                          {animal.status === 'Архив' && (
                            <span className="ml-1 text-red-500">(Архив)</span>
                          )}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Бык-осеменитель</label>
                <select
                  name="bullId"
                  value={formData.bullId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите быка</option>
                  {bulls.map(bull => (
                    <option key={bull.id} value={bull.id} disabled={bull.remainingDoses <= 0}>
                      {bull.code} - {bull.name} (Осталось доз: {bull.remainingDoses})
                    </option>
                  ))}
                </select>
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
                  {inseminators.map(inseminator => (
                    <option key={inseminator.id} value={inseminator.id}>
                      {inseminator.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setAnimalNumbers('');
                    setSelectedAnimals([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md text-white ${
                    isFormValid 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!isFormValid}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWriteOffForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Списание доз</h2>
              <button
                onClick={() => setShowWriteOffForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleWriteOffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Бык</label>
                <select
                  value={writeOffData.bullId}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, bullId: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите быка</option>
                  {bulls.filter(bull => bull.remainingDoses > 0).map(bull => (
                    <option key={bull.id} value={bull.id}>
                      {bull.code} - {bull.name} (Остаток: {bull.remainingDoses})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Количество доз</label>
                <input
                  type="number"
                  min="1"
                  max={writeOffData.bullId ? bulls.find(b => b.id === writeOffData.bullId)?.remainingDoses : undefined}
                  value={writeOffData.quantity}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Причина списания</label>
                <textarea
                  value={writeOffData.reason}
                  onChange={(e) => setWriteOffData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  placeholder="Укажите причину списания доз"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWriteOffForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Списать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Удаление осеменения</h2>
              <button
                onClick={() => setShowDeleteForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Причина удаления</label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  placeholder="Укажите причину удаления осеменения"
                />
              </div>
              <p className="text-sm text-gray-500">
                После удаления запись будет помечена как "Удалено", а статус животного будет возвращен в предыдущее состояние.
                <br />
                <strong className="text-blue-600">Дозы семени будут автоматически возвращены быку.</strong>
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  disabled={!deletionReason.trim()}
                >
                  Удалить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Быки-осеменители</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена дозы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток доз</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bulls.map(bull => (
                <tr key={bull.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bull.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bull.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bull.price}₽</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bull.remainingDoses}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {bull.remainingDoses > 0 && (
                        <button
                          onClick={() => setShowWriteOffForm(true)}
                          className="text-red-600 hover:text-red-800 px-2 py-1 text-xs bg-red-100 rounded"
                        >
                          Списать дозы
                        </button>
                      )}
                      <button
                        onClick={() => handleBullDelete(bull)}
                        className="text-red-600 hover:text-red-800"
                        disabled={bull.remainingDoses > 0}
                        title={bull.remainingDoses > 0 ? 'Нельзя удалить быка с остатком доз' : 'Удалить'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Поиск по номеру животного..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бык</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исполнитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дней</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayInseminations.map(insemination => {
                const bull = getBullById(insemination.bullId);
                const executor = inseminators.find(e => e.id === insemination.executorId);
                const animal = animals.find(a => a.id === insemination.animalId);
                const daysFromInsemination = differenceInDays(
                  new Date(),
                  new Date(insemination.date)
                );

                return (
                  <tr key={insemination.id} className={insemination.isDeleted ? "bg-gray-100" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{insemination.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{insemination.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal?.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bull?.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{executor?.fullName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          insemination.status === 'СТЕЛ' ? 'bg-green-100 text-green-800' :
                          insemination.status === 'ЯЛОВАЯ' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insemination.status}
                        </span>
                        {insemination.isDeleted && (
                          <div className="mt-1">
                            <span className="text-xs text-red-600 font-medium">УДАЛЕНО</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{daysFromInsemination}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!insemination.isDeleted && (
                        <button 
                          onClick={() => handleDeleteClick(insemination.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Удалить осеменение"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      {insemination.isDeleted && insemination.deletionReason && (
                        <div className="text-xs text-gray-500" title={insemination.deletionReason}>
                          Причина: {insemination.deletionReason.substring(0, 20)}
                          {insemination.deletionReason.length > 20 ? '...' : ''}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Скрытый iframe для печати отчета */}
      <iframe
        ref={printFrameRef}
        style={{ display: 'none' }}
        title="Отчет по осеменениям"
      />
    </div>
  );
};

export default Insemination;