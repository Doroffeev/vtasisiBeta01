import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Download, Upload, Trash2, X, AlertTriangle, FileText, Printer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useGroups } from '../contexts/GroupsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useUser } from '../contexts/UserContext';
import { format } from 'date-fns';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';

interface Calving {
  id: string;
  motherId: string;
  date: string;
  status: 'success' | 'abortion' | 'stillbirth';
  childId?: string;
  childNumber?: string;
  childResponder?: string;
  childGroupId?: string;
  childGender?: 'male' | 'female';
  childWeight?: string; // Добавлено поле для веса теленка
  notes: string;
  hasMastitis: boolean;
  executorId: string;
  newMotherGroupId: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

const STORAGE_KEY = 'calvings_data';

// Функция для проверки и преобразования строк в валидные UUID
const ensureValidUuid = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  
  // Регулярное выражение для проверки UUID формата
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(value)) {
    return value;
  } else {
    // Если это не валидный UUID, генерируем новый
    return crypto.randomUUID();
  }
};

const Calvings: React.FC = () => {
  const { groups } = useGroups();
  const { animals, addAnimal, updateAnimalCalving, updateAnimalGroup, updateAnimal } = useMovements();
  const { getUsersByRole, currentUser } = useUser();
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calvings, setCalvings] = useState<Calving[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для предупреждения о статусе "Архив"
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAnimalNumber, setArchiveAnimalNumber] = useState('');

  // Состояние для удаления отела
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedCalvingId, setSelectedCalvingId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Состояние для отчета
  const [showReportModal, setShowReportModal] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  
  // Состояния для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState<Calving>({
    id: '',
    motherId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'success',
    childNumber: '',
    childResponder: '',
    childGroupId: '',
    childGender: undefined,
    childWeight: '', // Инициализируем поле веса теленка
    notes: '',
    hasMastitis: false,
    executorId: '',
    newMotherGroupId: ''
  });

  // Получаем активных пользователей с ролью CARETAKER (Телятница)
  const caretakers = getUsersByRole('CARETAKER');

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadCalvings();
  }, []);

  // Функция для загрузки данных из Supabase или localStorage
  const loadCalvings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Пробуем загрузить из localStorage
      const savedData = localStorage.getItem(STORAGE_KEY);
      const localCalvings = savedData ? JSON.parse(savedData) : [];
      
      if (!supabase) {
        // Если Supabase не доступен, используем только localStorage
        setCalvings(localCalvings);
        setIsLoading(false);
        return;
      }
      
      // Пробуем загрузить из Supabase
      const { data, error } = await supabase
        .from('calvings')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Ошибка при загрузке отелов:', error.message);
        // Если ошибка, используем данные из localStorage
        setCalvings(localCalvings);
        
        // Проверяем, связана ли ошибка с отсутствием таблицы
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          setError('Таблица отелов не существует в базе данных. Используются локальные данные.');
        } else {
          setError(`Ошибка при загрузке отелов: ${error.message}`);
        }
      } else if (data) {
        // Преобразуем данные из Supabase в формат нашего интерфейса
        const formattedCalvings: Calving[] = data.map(calving => ({
          id: calving.id,
          motherId: calving.mother_id || '',
          date: calving.date,
          status: calving.status,
          childId: calving.child_id,
          childNumber: calving.child_number,
          childResponder: calving.child_responder,
          childGroupId: calving.child_group_id,
          childGender: calving.child_gender,
          childWeight: calving.child_weight,
          notes: calving.notes || '',
          hasMastitis: calving.has_mastitis,
          executorId: calving.executor_id || '',
          newMotherGroupId: calving.new_mother_group_id || '',
          isDeleted: calving.is_deleted || false,
          deletedAt: calving.deleted_at,
          deletedBy: calving.deleted_by,
          deletionReason: calving.deleted_reason
        }));
        
        // Обновляем локальное хранилище с данными из Supabase
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formattedCalvings));
        setCalvings(formattedCalvings);
      }
    } catch (err) {
      console.error('Ошибка при загрузке отелов:', err);
      
      // Пробуем загрузить резервные данные из localStorage
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          setCalvings(JSON.parse(savedData));
          setError('Ошибка подключения к базе данных. Используются сохраненные данные.');
        } else {
          setCalvings([]);
          setError('Ошибка при загрузке отелов. Данные не найдены.');
        }
      } catch (e) {
        setCalvings([]);
        setError('Ошибка при загрузке локальных данных.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: checkbox.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Проверка наличия пользователя в таблице users перед добавлением записи в журнал
  const checkUserExists = async (userId: string | undefined): Promise<boolean> => {
    if (!userId || !supabase) return false;
    
    try {
      // Исправлено: Не используем .single(), так как это вызывает ошибку, если запись не найдена
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId);
        
      if (error) {
        console.warn('Ошибка при проверке наличия пользователя:', error.message);
        return false;
      }
      
      // Проверяем, что есть данные и массив не пустой
      return data && data.length > 0;
    } catch (err) {
      console.error('Ошибка при проверке наличия пользователя:', err);
      return false;
    }
  };

  // Добавление записи в журнал с проверкой существования пользователя
  const addCalvingLog = async (calvingId: string, action: 'CREATE' | 'DELETE', details: string) => {
    if (!supabase || !calvingId) return;
    
    try {
      // Get current user ID
      const userId = currentUser?.id;
      
      // Check if the user exists
      if (!userId || !(await checkUserExists(userId))) {
        console.warn('Запись в журнал не добавлена: пользователь не существует в базе данных');
        return;
      }
      
      await supabase
        .from('calving_logs')
        .insert([{
          calving_id: ensureValidUuid(calvingId),
          user_id: userId,
          action: action,
          details: details
        }]);
    } catch (err) {
      console.error('Ошибка при добавлении записи в журнал:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем статус животного
    const motherAnimal = animals.find(a => a.id === formData.motherId);
    if (motherAnimal?.status === 'Архив') {
      setArchiveAnimalNumber(motherAnimal.number);
      setShowArchiveWarning(true);
      return;
    }

    // Генерируем UUID для нового отела
    const newCalvingId = crypto.randomUUID();
    
    const newCalving = {
      ...formData,
      id: newCalvingId // Используем UUID вместо timestamp
    };
    
    // Добавляем в локальное состояние
    const updatedCalvings = [...calvings, newCalving];
    setCalvings(updatedCalvings);
    
    // Сохраняем в localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCalvings));

    // Если Supabase доступен, сохраняем в базу данных
    if (supabase) {
      try {
        // Проверяем UUID поля перед отправкой в Supabase
        const validatedMotherId = ensureValidUuid(newCalving.motherId);
        const validatedChildId = ensureValidUuid(newCalving.childId);
        const validatedExecutorId = ensureValidUuid(newCalving.executorId);
        const validatedNewMotherGroupId = ensureValidUuid(newCalving.newMotherGroupId);
        const validatedChildGroupId = ensureValidUuid(newCalving.childGroupId);

        const { data, error } = await supabase
          .from('calvings')
          .insert([{
            id: newCalvingId, // Явно указываем UUID
            mother_id: validatedMotherId,
            date: newCalving.date,
            status: newCalving.status,
            child_id: validatedChildId,
            child_number: newCalving.childNumber,
            child_responder: newCalving.childResponder,
            child_group_id: validatedChildGroupId,
            child_gender: newCalving.childGender,
            child_weight: newCalving.childWeight,
            notes: newCalving.notes,
            has_mastitis: newCalving.hasMastitis,
            executor_id: validatedExecutorId,
            new_mother_group_id: validatedNewMotherGroupId
          }])
          .select();

        if (error) {
          console.error('Ошибка при сохранении отела в Supabase:', error.message);
        } else {
          // Получаем ID созданной записи из ответа
          const createdCalvingId = data && data[0] ? data[0].id : newCalvingId;
          
          // Добавляем запись в журнал действий с отелами с проверкой существования пользователя
          await addCalvingLog(
            createdCalvingId, 
            'CREATE', 
            `Создан отел для животного №${motherAnimal?.number || 'неизвестно'}`
          );
        }
      } catch (err) {
        console.error('Ошибка при сохранении отела:', err);
      }
    }

    // Update mother's calving date, group and mastitis status
    await updateAnimalCalving(newCalving.motherId, newCalving.date, newCalving.hasMastitis);
    if (newCalving.newMotherGroupId) {
      await updateAnimalGroup(newCalving.motherId, newCalving.newMotherGroupId);
    }

    // Add new animal if calving was successful
    if (newCalving.status === 'success' && newCalving.childNumber && newCalving.childGender) {
      try {
        // Создаем нового животного с корректным именем и номером
        const newAnimal = await addAnimal({
          name: newCalving.childNumber, // Устанавливаем имя равным номеру
          number: newCalving.childNumber,
          groupId: newCalving.childGroupId || groups[0]?.id,
          status: 'Без',
          gender: newCalving.childGender,
          birthDate: newCalving.date,
          motherId: newCalving.motherId,
          isUnderTreatment: false,
          hasMastitis: false,
          weight: newCalving.childWeight ? parseFloat(newCalving.childWeight) : undefined,
          nextCalvingDate: '',
          lactation: 0,
          responder: newCalving.childResponder || '',
          daysInMilk: 0,
          inseminationCount: 0
        });
        
        console.log('Создано новое животное (теленок):', newAnimal);
      } catch (err) {
        console.error('Ошибка при создании нового животного (теленка):', err);
      }
    }

    setShowForm(false);
    setFormData({
      id: '',
      motherId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'success',
      childNumber: '',
      childResponder: '',
      childGroupId: '',
      childGender: undefined,
      childWeight: '',
      notes: '',
      hasMastitis: false,
      executorId: '',
      newMotherGroupId: ''
    });
  };

  // Функция для удаления отела с проверкой существования пользователя
  const handleDeleteCalving = async () => {
    if (!selectedCalvingId || !deletionReason.trim()) {
      return;
    }
    
    try {
      const calving = calvings.find(c => c.id === selectedCalvingId);
      if (!calving) return;
      
      // Проверяем существование пользователя перед удалением
      let validUserId: string | null = null;
      if (currentUser?.id && supabase) {
        const userExists = await checkUserExists(currentUser.id);
        if (userExists) {
          validUserId = currentUser.id;
        }
      }
      
      // Помечаем запись как удаленную в локальном состоянии
      const now = new Date().toISOString();
      const updatedCalvings = calvings.map(c => 
        c.id === selectedCalvingId ? { 
          ...c, 
          isDeleted: true,
          deletedAt: now,
          deletedBy: validUserId || '',
          deletionReason: deletionReason 
        } : c
      );
      
      setCalvings(updatedCalvings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCalvings));
      
      // Если отёл был успешным и есть потомство, удаляем его из базы
      if (calving.status === 'success' && calving.childNumber) {
        // Находим животное по номеру
        const childAnimal = animals.find(a => a.number === calving.childNumber);
        
        if (childAnimal) {
          // Удаляем животное (переводим в статус "Архив")
          await updateAnimal(childAnimal.id, { status: 'Архив' });
          console.log(`Теленок №${childAnimal.number} переведен в статус "Архив"`);
        }
      }
      
      // Возвращаем матери предыдущий статус (обычно "Без" или другой подходящий)
      if (calving.motherId) {
        await updateAnimal(calving.motherId, { status: 'Без' });
        console.log(`Животное №${animals.find(a => a.id === calving.motherId)?.number} возвращен статус "Без"`);
      }
      
      // Если Supabase доступен, обновляем запись в базе данных
      if (supabase) {
        // Обновляем запись отела, используя null для deleted_by если нет валидного пользователя
        await supabase
          .from('calvings')
          .update({
            is_deleted: true,
            deleted_at: now,
            deleted_by: validUserId || null, // Используем null если пользователь не существует
            deletion_reason: deletionReason
          })
          .eq('id', selectedCalvingId);
        
        // Создаем запись в журнале действий только если пользователь существует
        if (validUserId) {
          await addCalvingLog(
            selectedCalvingId,
            'DELETE',
            `Удален отел. Причина: ${deletionReason}`
          );
        }
      }
      
      setShowDeleteConfirmation(false);
      setSelectedCalvingId(null);
      setDeletionReason('');
      
    } catch (error) {
      console.error('Ошибка при удалении отела:', error);
      setError('Не удалось удалить отел');
    }
  };

  // Обработчик нажатия кнопки удаления
  const handleDeleteButtonClick = (calvingId: string) => {
    // Проверяем, удалена ли уже запись
    const calving = calvings.find(c => c.id === calvingId);
    if (calving?.isDeleted) {
      alert('Запись уже удалена');
      return;
    }
    
    setSelectedCalvingId(calvingId);
    setDeletionReason('');
    setShowDeleteConfirmation(true);
  };

  const handleExport = () => {
    const headers = ['Дата', '№ матери', 'Статус', '№ теленка', 'Пол', 'Вес', 'Группа', 'Мастит', 'Исполнитель', 'Примечания'];
    const rows = calvings.map(calving => {
      // Находим животное по ID для получения номера
      const mother = animals.find(a => a.id === calving.motherId);
      // Находим группу по ID для получения номера группы
      const childGroup = groups.find(g => g.id === calving.childGroupId);
      // Находим исполнителя по ID
      const executor = caretakers.find(c => c.id === calving.executorId);
      
      return [
        calving.date,
        mother?.number || calving.motherId,
        calving.status === 'success' ? 'Успешно' : calving.status === 'abortion' ? 'Аборт' : 'Мертворождение',
        calving.childNumber || '',
        calving.childGender === 'female' ? 'Телка' : calving.childGender === 'male' ? 'Бычок' : '',
        calving.childWeight || '',
        childGroup ? childGroup.number : '',
        calving.hasMastitis ? 'Да' : 'Нет',
        executor?.fullName || '',
        calving.notes
      ];
    });

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `calvings_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };

  // Генерация отчета "Журнал отелов"
  const generateReport = () => {
    setShowReportModal(true);
  };

  // Печать отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };

  // Генерация HTML для печати отчета
  const generateReportHTML = () => {
    // Фильтрация активных записей (не удаленных)
    const activeCalvings = calvings.filter(calving => !calving.isDeleted);
    
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Журнал отелов</title>
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
          <div class="report-title">ЖУРНАЛ ОТЕЛОВ</div>
          <div class="report-date">по состоянию на ${format(new Date(), 'dd.MM.yyyy')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>№ матери</th>
              <th>Статус</th>
              <th>№ теленка</th>
              <th>Пол</th>
              <th>Вес</th>
              <th>Группа</th>
              <th>Мастит</th>
              <th>Исполнитель</th>
              <th>Примечания</th>
            </tr>
          </thead>
          <tbody>
            ${activeCalvings.map((calving, index) => {
              // Находим животное по ID для получения номера
              const mother = animals.find(a => a.id === calving.motherId);
              // Находим группу по ID для получения номера группы
              const childGroup = groups.find(g => g.id === calving.childGroupId);
              // Находим исполнителя по ID
              const executor = caretakers.find(c => c.id === calving.executorId);
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${calving.date}</td>
                  <td>${mother?.number || ''}</td>
                  <td>${calving.status === 'success' ? 'Успешно' : calving.status === 'abortion' ? 'Аборт' : 'Мертворождение'}</td>
                  <td>${calving.childNumber || ''}</td>
                  <td>${calving.childGender === 'female' ? 'Телка' : calving.childGender === 'male' ? 'Бычок' : ''}</td>
                  <td>${calving.childWeight || ''}</td>
                  <td>${childGroup ? childGroup.number : ''}</td>
                  <td>${calving.hasMastitis ? 'Да' : 'Нет'}</td>
                  <td>${executor?.fullName || ''}</td>
                  <td>${calving.notes || ''}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="signatures">
          <div>
            <div>Руководитель: _______________________</div>
            <div class="signature-line">(подпись)</div>
          </div>
          <div>
            <div>Ответственный: _______________________</div>
            <div class="signature-line">(подпись)</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Печать отчета</button>
        </div>
      </body>
      </html>
    `;
  };

  // Фильтрация отелов по поисковому запросу
  const filteredCalvings = calvings.filter(calving => {
    // Находим животное для поиска по номеру
    const mother = animals.find(a => a.id === calving.motherId);
    
    if (!searchTerm) return true;
    
    return (
      mother?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calving.childNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calving.date.includes(searchTerm)
    );
  });

  // Пагинация: вычисление общего количества страниц
  const totalPages = Math.ceil(filteredCalvings.length / pageSize);

  // Пагинация: получение данных для текущей страницы
  const paginatedCalvings = filteredCalvings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Функции для навигации между страницами
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToLastPage = () => goToPage(totalPages);

  // Обработчик изменения размера страницы
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    setPageSize(newPageSize);
    setCurrentPage(1); // Сбрасываем на первую страницу при изменении размера
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Отёлы</h1>
        <div className="flex space-x-4">
          <input
            type="file"
            ref={fileInputRef}
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
            onClick={generateReport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить отёл
          </button>
        </div>
      </div>

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

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-600">Подтверждение удаления</h3>
                <p className="mt-2 text-gray-600">
                  Вы уверены, что хотите удалить отел? Если отел был успешным, потомство будет удалено.
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Причина удаления</label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Укажите причину удаления"
                rows={3}
                required
              ></textarea>
            </div>
            
            <div className="mt-5 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setSelectedCalvingId(null);
                  setDeletionReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteCalving}
                className={`px-4 py-2 rounded-md text-white ${
                  deletionReason.trim() 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!deletionReason.trim()}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Журнал отелов</h2>
              <div className="flex space-x-3">
                <button
                  onClick={handlePrintReport}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Printer size={20} className="mr-2" />
                  Печать
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="bg-gray-100 text-gray-700 p-2 rounded-full hover:bg-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto bg-gray-50 p-4">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Журнал отелов"
              />
            </div>
          </div>
        </div>
      )}

      {/* Индикатор ошибки */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">Добавить отёл</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">№ матери</label>
                  <select
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
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
                  <label className="block text-sm font-medium text-gray-700">Дата отёла</label>
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
                  <label className="block text-sm font-medium text-gray-700">Статус</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="success">Успешный отёл</option>
                    <option value="abortion">Аборт</option>
                    <option value="stillbirth">Мертворождение</option>
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
                    {caretakers.map(caretaker => (
                      <option key={caretaker.id} value={caretaker.id}>
                        {caretaker.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Новая группа матери</label>
                  <select
                    name="newMotherGroupId"
                    value={formData.newMotherGroupId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Мастит</label>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="hasMastitis"
                        checked={formData.hasMastitis}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Послеродовой мастит</span>
                    </label>
                  </div>
                </div>
              </div>

              {formData.status === 'success' && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Данные теленка</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">№ теленка</label>
                      <input
                        type="text"
                        name="childNumber"
                        value={formData.childNumber}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Респондер</label>
                      <input
                        type="text"
                        name="childResponder"
                        value={formData.childResponder}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Группа</label>
                      <select
                        name="childGroupId"
                        value={formData.childGroupId}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Выберите группу</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.number}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Пол</label>
                      <select
                        name="childGender"
                        value={formData.childGender}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Выберите пол</option>
                        <option value="female">Телка</option>
                        <option value="male">Бычок</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Вес, кг</label>
                      <input
                        type="number"
                        name="childWeight"
                        value={formData.childWeight || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Введите вес теленка"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Примечания</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ матери</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ теленка</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Пол</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вес</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Группа</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Мастит</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исполнитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Примечания</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCalvings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                    Записи не найдены. Добавьте новый отёл, чтобы увидеть его здесь.
                  </td>
                </tr>
              ) : (
                paginatedCalvings.map(calving => {
                  // Находим соответствующее животное для отображения номера вместо ID
                  const mother = animals.find(a => a.id === calving.motherId);
                  // Находим соответствующую группу
                  const childGroup = groups.find(g => g.id === calving.childGroupId);
                  // Находим исполнителя
                  const executor = caretakers.find(c => c.id === calving.executorId);
                  
                  return (
                    <tr 
                      key={calving.id} 
                      className={calving.isDeleted ? 'bg-gray-100' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calving.date}
                        {calving.isDeleted && (
                          <span className="ml-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Удалено
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {mother ? mother.number : calving.motherId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          calving.status === 'success' ? 'bg-green-100 text-green-800' :
                          calving.status === 'abortion' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {calving.status === 'success' ? 'Успешно' :
                          calving.status === 'abortion' ? 'Аборт' :
                          'Мертворождение'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{calving.childNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {calving.childGender === 'female' ? 'Телка' : calving.childGender === 'male' ? 'Бычок' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{calving.childWeight}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {childGroup ? childGroup.number : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {calving.hasMastitis && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Да
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {executor ? executor.fullName : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {calving.isDeleted ? (
                          <span className="text-red-600">{calving.deletionReason || 'Удалено'}</span>
                        ) : (
                          calving.notes
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!calving.isDeleted && (
                          <button
                            onClick={() => handleDeleteButtonClick(calving.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить отел"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
              <option value={100}>100</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {filteredCalvings.length > 0 ? 
                `${Math.min((currentPage - 1) * pageSize + 1, filteredCalvings.length)} - ${Math.min(currentPage * pageSize, filteredCalvings.length)} из ${filteredCalvings.length}` : 
                '0 записей'
              }
            </span>
            <div className="flex items-center space-x-1">
              <button
                onClick={goToFirstPage}
                disabled={currentPage === 1 || filteredCalvings.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || filteredCalvings.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || filteredCalvings.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={goToLastPage}
                disabled={currentPage === totalPages || filteredCalvings.length === 0}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calvings;