import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Calendar, Download, Upload, X, ClipboardList, AlertTriangle, FileText, Printer, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useVetOperations, VetOperation, PlannedOperation, MedicationUsage } from '../contexts/VetOperationsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useUser, UserRole } from '../contexts/UserContext';
import { useMedications } from '../contexts/MedicationsContext';
import { useNomenclature } from '../contexts/NomenclatureContext';
import { saveAs } from 'file-saver';
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { Link } from 'react-router-dom';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useFilter } from '../contexts/FilterContext';

interface OperationType {
  id: string;
  code: string;
  name: string;
  category: 'ТРАВМА_ОРТОПЕД' | 'ВАКЦИНАЦИЯ' | 'ЛЕЧЕНИЕ' | 'ОСМОТР' | 'ПАДЕЖ';
}

interface SelectedAnimal {
  id: string;
  number: string;
}

const categoryLabels: Record<string, string> = {
  'ТРАВМА_ОРТОПЕД': 'Травма/Ортопед',
  'ВАКЦИНАЦИЯ': 'Вакцинация',
  'ЛЕЧЕНИЕ': 'Лечение',
  'ОСМОТР': 'Осмотр',
  'ПАДЕЖ': 'Падеж'
};

const VetOperations: React.FC = () => {
  const { operations, addOperation, deleteOperation, cancelOperation, isLoading, error } = useVetOperations();
  const { animals, startAnimalTreatment, endAnimalTreatment, updateAnimal } = useMovements();
  const { getUsersByRole } = useUser();
  const { medications } = useMedications();
  const { items: nomenclatureItems } = useNomenclature();
  const { showDeleted } = useFilter();
  
  const [showForm, setShowForm] = useState(false);
  const [showDeathForm, setShowDeathForm] = useState(false);
  const [showOperationCodesForm, setShowOperationCodesForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showArchiveWarning, setShowArchiveWarning] = useState(false);
  const [archiveAnimalNumber, setArchiveAnimalNumber] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [selectedAnimalForDeath, setSelectedAnimalForDeath] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [deathReason, setDeathReason] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  
  // Состояние для выбора нескольких животных
  const [selectedAnimals, setSelectedAnimals] = useState<SelectedAnimal[]>([]);
  const [showAnimalSelector, setShowAnimalSelector] = useState(false);
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  const [animalSelectorPage, setAnimalSelectorPage] = useState(1);
  const [animalSelectorPageSize, setAnimalSelectorPageSize] = useState(20);
  const [sortField, setSortField] = useState<'number' | 'groupId' | 'status'>('number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Состояние для отчета
  const [reportFilters, setReportFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    animalId: '',
    executorId: '',
    operationCode: '',
    searchTerm: ''
  });

  const [filters, setFilters] = useState({
    searchTerm: '',
    batchNumber: '',
    category: ''
  });

  const [operationTypes, setOperationTypes] = useState<OperationType[]>([
    { id: '1', code: 'ТРАВМА_ОРТОПЕД', name: 'Травма/Ортопед', category: 'ТРАВМА_ОРТОПЕД' },
    { id: '2', code: 'IBR', name: 'IBR', category: 'ВАКЦИНАЦИЯ' },
    { id: '3', code: 'ABORT', name: 'Аборт', category: 'ЛЕЧЕНИЕ' },
    { id: '4', code: 'ВАКЦИНАЦИЯ', name: 'Вакцинация', category: 'ВАКЦИНАЦИЯ' },
    { id: '5', code: 'ОСМОТР', name: 'Плановый осмотр', category: 'ОСМОТР' },
    { id: '6', code: 'ПАДЕЖ', name: 'Падеж', category: 'ПАДЕЖ' }
  ]);

  const [newOperationType, setNewOperationType] = useState<Omit<OperationType, 'id'>>({
    code: '',
    name: '',
    category: 'ТРАВМА_ОРТОПЕД'
  });

  const [formData, setFormData] = useState<Omit<VetOperation, 'id'>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    code: '',
    price: '',
    executorId: '',
    result: '',
    comments: [],
    animalId: '',
    plannedOperations: [],
    medications: []
  });

  const [selectedMedications, setSelectedMedications] = useState<MedicationUsage[]>([]);

  // Получаем пользователей с ролью VET для выбора исполнителя
  const veterinarians = getUsersByRole('VET');

  const [showTreatmentEndForm, setShowTreatmentEndForm] = useState(false);
  const [selectedAnimalForTreatmentEnd, setSelectedAnimalForTreatmentEnd] = useState<string | null>(null);
  const [treatmentEndExecutor, setTreatmentEndExecutor] = useState('');
  const [treatmentEndNotes, setTreatmentEndNotes] = useState('');

  // Обработчик сортировки
  const handleSort = (field: 'number' | 'groupId' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Фильтрация и сортировка животных для селектора
  const filteredAndSortedAnimals = animals
    .filter(animal => 
      animal.status !== 'Архив' && 
      animal.number.toLowerCase().includes(animalSearchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'number') {
        return sortDirection === 'asc' 
          ? a.number.localeCompare(b.number) 
          : b.number.localeCompare(a.number);
      } else if (sortField === 'groupId') {
        return sortDirection === 'asc'
          ? (a.groupId || '').localeCompare(b.groupId || '')
          : (b.groupId || '').localeCompare(a.groupId || '');
      } else {
        return sortDirection === 'asc'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
    });

  // Пагинация животных
  const paginatedAnimals = filteredAndSortedAnimals.slice(
    (animalSelectorPage - 1) * animalSelectorPageSize,
    animalSelectorPage * animalSelectorPageSize
  );

  const totalPages = Math.ceil(filteredAndSortedAnimals.length / animalSelectorPageSize);

  const handleEndTreatment = (animalId: string) => {
    // Проверяем статус животного
    const animal = animals.find(a => a.id === animalId);
    if (animal?.status === 'Архив') {
      setArchiveAnimalNumber(animal.number);
      setShowArchiveWarning(true);
      return;
    }
    
    setSelectedAnimalForTreatmentEnd(animalId);
    setShowTreatmentEndForm(true);
  };

  const handleTreatmentEndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAnimalForTreatmentEnd && treatmentEndExecutor) {
      endAnimalTreatment(selectedAnimalForTreatmentEnd, treatmentEndExecutor);
      setShowTreatmentEndForm(false);
      setSelectedAnimalForTreatmentEnd(null);
      setTreatmentEndExecutor('');
      setTreatmentEndNotes('');
    }
  };

  const filteredMedications = medications.filter(med => {
    const nomenclature = nomenclatureItems.find(item => item.id === med.nomenclatureId);
    if (!nomenclature) return false;

    const matchesSearch = 
      nomenclature.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      nomenclature.code.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    const matchesBatch = !filters.batchNumber || 
      med.batchNumber.toLowerCase().includes(filters.batchNumber.toLowerCase());
    
    const matchesCategory = !filters.category || 
      nomenclature.category === filters.category;

    return matchesSearch && matchesBatch && matchesCategory;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddMedication = () => {
    setSelectedMedications(prev => [...prev, { medicationId: '', quantity: 0, totalPrice: 0 }]);
  };

  const handleMedicationChange = (index: number, field: 'medicationId' | 'quantity', value: string | number) => {
    setSelectedMedications(prev => {
      const updated = [...prev];
      if (field === 'medicationId') {
        const medication = medications.find(m => m.id === value);
        updated[index] = {
          medicationId: value as string,
          quantity: updated[index].quantity,
          totalPrice: medication ? medication.unitPrice * updated[index].quantity : 0
        };
      } else {
        const medication = medications.find(m => m.id === updated[index].medicationId);
        updated[index] = {
          ...updated[index],
          quantity: Number(value),
          totalPrice: medication ? medication.unitPrice * Number(value) : 0
        };
      }
      return updated;
    });
  };

  const handleRemoveMedication = (index: number) => {
    setSelectedMedications(prev => prev.filter((_, i) => i !== index));
  };

  // Обработчик выбора животного в селекторе
  const handleAnimalSelect = (animal: { id: string; number: string }) => {
    const isAlreadySelected = selectedAnimals.some(a => a.id === animal.id);
    
    if (isAlreadySelected) {
      setSelectedAnimals(prev => prev.filter(a => a.id !== animal.id));
    } else {
      setSelectedAnimals(prev => [...prev, animal]);
    }
  };

  // Обработчик подтверждения выбора животных
  const confirmAnimalSelection = () => {
    if (selectedAnimals.length > 0) {
      // Устанавливаем первое животное как основное в форме
      setFormData(prev => ({
        ...prev,
        animalId: selectedAnimals[0].id
      }));
    }
    setShowAnimalSelector(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем статус животного перед добавлением операции
    const animal = animals.find(a => a.id === formData.animalId);
    if (animal?.status === 'Архив') {
      setArchiveAnimalNumber(animal.number);
      setShowArchiveWarning(true);
      return;
    }
    
    try {
      // Добавляем операцию для первого животного (основного)
      const operation = await addOperation({
        ...formData,
        medications: selectedMedications
      });

      // Если операция типа не вакцинация, отмечаем животное как находящееся на лечении
      if (operation.code !== 'ВАКЦИНАЦИЯ') {
        startAnimalTreatment(operation.animalId);
      }

      // Если выбрано более одного животного, добавляем операции для остальных
      if (selectedAnimals.length > 1) {
        for (let i = 1; i < selectedAnimals.length; i++) {
          const additionalOperation = await addOperation({
            ...formData,
            animalId: selectedAnimals[i].id,
            medications: selectedMedications
          });

          // Если операция типа не вакцинация, отмечаем животное как находящееся на лечении
          if (additionalOperation.code !== 'ВАКЦИНАЦИЯ') {
            startAnimalTreatment(additionalOperation.animalId);
          }
        }
      }

      // Сбрасываем форму
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        code: '',
        price: '',
        executorId: '',
        result: '',
        comments: [],
        animalId: '',
        plannedOperations: [],
        medications: []
      });
      setSelectedMedications([]);
      setSelectedAnimals([]);
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка при добавлении операций:', error);
      alert('Произошла ошибка при добавлении операций. Пожалуйста, попробуйте снова.');
    }
  };

  const handleDelete = (operationId: string) => {
    setSelectedOperationId(operationId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (selectedOperationId && deletionReason.trim()) {
      await deleteOperation(selectedOperationId, deletionReason);
      setShowDeleteConfirm(false);
      setSelectedOperationId(null);
      setDeletionReason('');
    }
  };

  const handleCancel = (operationId: string) => {
    setSelectedOperationId(operationId);
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    if (selectedOperationId && cancellationReason.trim()) {
      await cancelOperation(selectedOperationId, cancellationReason);
      
      // Если это операция падежа, обновляем статус животного обратно из "Архив"
      const operation = operations.find(op => op.id === selectedOperationId);
      if (operation && operation.code === 'ПАДЕЖ' && operation.animalId) {
        updateAnimal(operation.animalId, {
          status: 'Без' // Или любой другой подходящий статус
        });
      }
      
      setShowCancelConfirm(false);
      setSelectedOperationId(null);
      setCancellationReason('');
    }
  };

  const handleExport = () => {
    const headers = ['Дата', 'Время', 'Код', 'Цена', 'Исполнитель', 'Результат'];
    const rows = operations.map(op => [
      op.date,
      op.time,
      op.code,
      op.price,
      veterinarians.find(v => v.id === op.executorId)?.fullName || '',
      op.result
    ]);

    const content = [headers, ...rows].map(row => row.join('\t')).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `vet_operations_${format(new Date(), 'yyyy-MM-dd')}.txt`);
  };

  const renderMedicationOption = (medication: any) => {
    const nomenclature = nomenclatureItems.find(item => item.id === medication.nomenclatureId);
    if (!nomenclature) return null;

    return (
      <option key={medication.id} value={medication.id}>
        {nomenclature.name} - Партия {medication.batchNumber} 
        (Остаток: {medication.remainingQuantity} {nomenclature.unit})
      </option>
    );
  };

  const renderFilters = () => (
    <div className="p-4 border-b border-gray-200">
      <div className="grid grid-cols-3 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>
        <div>
          <input
            type="text"
            placeholder="Поиск по номеру партии..."
            value={filters.batchNumber}
            onChange={(e) => setFilters(prev => ({ ...prev, batchNumber: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Все категории</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderMedicationSelection = (med: MedicationUsage, index: number) => {
    const medicationOptions = filteredMedications
      .filter(m => m.remainingQuantity > 0)
      .map(medication => {
        const nomenclature = nomenclatureItems.find(item => item.id === medication.nomenclatureId);
        return {
          value: medication.id,
          label: nomenclature 
            ? `${nomenclature.name} - Партия ${medication.batchNumber} (Остаток: ${medication.remainingQuantity} ${nomenclature.unit})`
            : medication.id,
          disabled: medication.remainingQuantity <= 0
        };
      });

    return (
      <div key={index} className="flex items-center space-x-4">
        <div className="flex-1">
          <SearchableSelect
            options={medicationOptions}
            value={med.medicationId}
            onChange={(value) => handleMedicationChange(index, 'medicationId', value)}
            placeholder="Выберите препарат"
            required
          />
        </div>
        <div className="w-32">
          <input
            type="number"
            min="1"
            max={med.medicationId ? 
              medications.find(m => m.id === med.medicationId)?.remainingQuantity 
              : undefined
            }
            value={med.quantity}
            onChange={(e) => handleMedicationChange(index, 'quantity', parseInt(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Количество"
            required
          />
        </div>
        <button
          type="button"
          onClick={() => handleRemoveMedication(index)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  };

  const renderMedicationsCell = (medications: MedicationUsage[]) => (
    <td className="px-6 py-4 text-sm text-gray-500">
      {medications.map((med, index) => {
        const medication = medications.find(m => m.id === med.medicationId);
        const nomenclature = medication ? 
          nomenclatureItems.find(item => item.id === medication.nomenclatureId) 
          : null;
        
        return nomenclature ? (
          <div key={index}>
            {nomenclature.name} - Партия {medication.batchNumber}
            <br />
            <span className="text-xs text-gray-400">
              ({med.quantity} {nomenclature.unit})
            </span>
          </div>
        ) : null;
      })}
    </td>
  );

  // Обработчик для открытия формы регистрации падежа
  const handleOpenDeathForm = () => {
    setDeathReason('');
    setPhotoAttached(false);
    setSelectedAnimalForDeath('');
    setShowDeathForm(true);
  };

  // Обработчик для регистрации падежа
  const handleDeathSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAnimalForDeath || !deathReason) {
      return;
    }
    
    // Проверяем статус животного
    const animal = animals.find(a => a.id === selectedAnimalForDeath);
    if (animal?.status === 'Архив') {
      setArchiveAnimalNumber(animal.number);
      setShowArchiveWarning(true);
      return;
    }
    
    try {
      // Добавляем операцию падежа
      const operation = await addOperation({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        code: 'ПАДЕЖ',
        price: '',
        executorId: veterinarians.length > 0 ? veterinarians[0].id : '',
        result: deathReason,
        comments: [],
        animalId: selectedAnimalForDeath,
        plannedOperations: [],
        medications: []
      });
      
      // Обновляем статус животного на "Архив"
      updateAnimal(selectedAnimalForDeath, { 
        status: 'Архив'
      });
      
      // Сбрасываем форму и закрываем её
      setDeathReason('');
      setPhotoAttached(false);
      setSelectedAnimalForDeath('');
      setShowDeathForm(false);
    } catch (error) {
      console.error('Ошибка при регистрации падежа:', error);
      alert('Произошла ошибка при регистрации падежа. Пожалуйста, попробуйте снова.');
    }
  };

  // Функция для генерации отчета
  const generateReport = () => {
    setReportFilters({
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      animalId: '',
      executorId: '',
      operationCode: '',
      searchTerm: ''
    });
    setShowReportModal(true);
  };

  // Функция для печати отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };

  // Фильтрация операций для отчета
  const filteredOperationsForReport = operations.filter(operation => {
    // Фильтр по дате
    const operationDate = new Date(operation.date);
    const startDate = reportFilters.startDate ? new Date(reportFilters.startDate) : null;
    const endDate = reportFilters.endDate ? new Date(reportFilters.endDate) : null;
    
    const matchesDateRange = (!startDate || operationDate >= startDate) && 
                            (!endDate || operationDate <= endDate);
    
    // Фильтр по животному
    const matchesAnimal = !reportFilters.animalId || operation.animalId === reportFilters.animalId;
    
    // Фильтр по исполнителю
    const matchesExecutor = !reportFilters.executorId || operation.executorId === reportFilters.executorId;
    
    // Фильтр по коду операции
    const matchesCode = !reportFilters.operationCode || operation.code === reportFilters.operationCode;
    
    // Фильтр по поисковому запросу
    const animal = animals.find(a => a.id === operation.animalId);
    const executor = veterinarians.find(v => v.id === operation.executorId);
    
    const matchesSearch = !reportFilters.searchTerm || 
      operation.code.toLowerCase().includes(reportFilters.searchTerm.toLowerCase()) ||
      (animal && animal.number.toLowerCase().includes(reportFilters.searchTerm.toLowerCase())) ||
      (executor && executor.fullName.toLowerCase().includes(reportFilters.searchTerm.toLowerCase())) ||
      operation.result.toLowerCase().includes(reportFilters.searchTerm.toLowerCase());
    
    // Фильтр по статусу удаления/отмены
    const matchesDeletedFilter = showDeleted || (!operation.isDeleted && !operation.isCancelled);
    
    return matchesDateRange && matchesAnimal && matchesExecutor && matchesCode && matchesSearch && matchesDeletedFilter;
  });

  // Генерация HTML для отчета
  const generateReportHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по ветеринарным операциям</title>
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
          <div class="report-title">ОТЧЕТ ПО ВЕТЕРИНАРНЫМ ОПЕРАЦИЯМ</div>
          <div class="report-date">
            ${reportFilters.startDate && reportFilters.endDate 
              ? `за период с ${format(new Date(reportFilters.startDate), 'dd.MM.yyyy')} по ${format(new Date(reportFilters.endDate), 'dd.MM.yyyy')}`
              : `по состоянию на ${format(new Date(), 'dd.MM.yyyy')}`}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Время</th>
              <th>№ животного</th>
              <th>Код</th>
              <th>Цена</th>
              <th>Исполнитель</th>
              <th>Препараты</th>
              <th>Результат</th>
              <th>Статус</th>
              <th>Схема лечения</th>
            </tr>
          </thead>
          <tbody>
            ${filteredOperationsForReport.map((operation, index) => {
              const animal = animals.find(a => a.id === operation.animalId);
              const executor = veterinarians.find(v => v.id === operation.executorId);
              
              // Получаем информацию о схеме лечения, если животное на лечении
              const animalTreatmentInfo = animal && animal.isUnderTreatment 
                ? 'На лечении' 
                : '';
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${operation.date}</td>
                  <td>${operation.time}</td>
                  <td>${animal ? animal.number : 'Неизвестно'}</td>
                  <td>${operation.code}</td>
                  <td>${operation.price || '-'}</td>
                  <td>${executor ? executor.fullName : 'Неизвестно'}</td>
                  <td>${operation.medications.map(med => {
                    const medication = medications.find(m => m.id === med.medicationId);
                    const nomenclature = medication 
                      ? nomenclatureItems.find(item => item.id === medication.nomenclatureId) 
                      : null;
                    return nomenclature 
                      ? `${nomenclature.name} (${med.quantity} ${nomenclature.unit})` 
                      : '';
                  }).join(', ')}</td>
                  <td>${operation.result || '-'}</td>
                  <td>${operation.isDeleted 
                    ? 'Удалено' 
                    : operation.isCancelled 
                      ? 'Отменено' 
                      : 'Активно'}</td>
                  <td>${animalTreatmentInfo}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="signatures">
          <div>
            <p>Руководитель: _______________________</p>
            <div class="signature-line">(подпись)</div>
          </div>
          <div>
            <p>Ответственный: _______________________</p>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Ветеринарные операции</h1>
        <div className="flex space-x-4">
          <Link
            to="/treatment-schemes"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <ClipboardList size={20} className="mr-2" />
            Схемы лечения
          </Link>
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
            onClick={() => setShowOperationCodesForm(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center"
          >
            <Filter size={20} className="mr-2" />
            Коды операций
          </button>
          <button
            onClick={handleOpenDeathForm}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
          >
            <AlertTriangle size={20} className="mr-2" />
            Падеж
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить операцию
          </button>
        </div>
      </div>

      {renderFilters()}

      {/* Предупреждение о статусе "Архив" */}
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

      {/* Модальное окно выбора животных */}
      {showAnimalSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Выбор животных</h2>
              <button
                onClick={() => setShowAnimalSelector(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4 relative">
              <input
                type="text"
                value={animalSearchTerm}
                onChange={(e) => {
                  setAnimalSearchTerm(e.target.value);
                  setAnimalSelectorPage(1); // Сбрасываем страницу при изменении поиска
                }}
                placeholder="Поиск по номеру животного..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={paginatedAnimals.length > 0 && paginatedAnimals.every(animal => 
                          selectedAnimals.some(selected => selected.id === animal.id)
                        )}
                        onChange={() => {
                          if (paginatedAnimals.every(animal => 
                            selectedAnimals.some(selected => selected.id === animal.id)
                          )) {
                            // Если все выбраны, снимаем выбор
                            setSelectedAnimals(prev => 
                              prev.filter(selected => 
                                !paginatedAnimals.some(animal => animal.id === selected.id)
                              )
                            );
                          } else {
                            // Иначе выбираем все
                            const newSelected = [...selectedAnimals];
                            paginatedAnimals.forEach(animal => {
                              if (!newSelected.some(selected => selected.id === animal.id)) {
                                newSelected.push({ id: animal.id, number: animal.number });
                              }
                            });
                            setSelectedAnimals(newSelected);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('number')}
                    >
                      <div className="flex items-center">
                        Номер
                        {sortField === 'number' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('groupId')}
                    >
                      <div className="flex items-center">
                        Группа
                        {sortField === 'groupId' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Статус
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedAnimals.map(animal => (
                    <tr 
                      key={animal.id} 
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedAnimals.some(selected => selected.id === animal.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleAnimalSelect({ id: animal.id, number: animal.number })}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAnimals.some(selected => selected.id === animal.id)}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {animal.groupId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.isUnderTreatment ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {animal.isUnderTreatment ? 'На лечении' : animal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  Показано {paginatedAnimals.length} из {filteredAndSortedAnimals.length} животных
                </span>
                <select
                  value={animalSelectorPageSize}
                  onChange={(e) => {
                    setAnimalSelectorPageSize(Number(e.target.value));
                    setAnimalSelectorPage(1); // Сбрасываем страницу при изменении размера страницы
                  }}
                  className="ml-4 px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAnimalSelectorPage(prev => Math.max(prev - 1, 1))}
                  disabled={animalSelectorPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    animalSelectorPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Назад
                </button>
                <span className="text-sm text-gray-700">
                  Страница {animalSelectorPage} из {totalPages || 1}
                </span>
                <button
                  onClick={() => setAnimalSelectorPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={animalSelectorPage >= totalPages}
                  className={`px-3 py-1 rounded-md ${
                    animalSelectorPage >= totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Вперед
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Выбрано животных: {selectedAnimals.length}
                </span>
                {selectedAnimals.length > 0 && (
                  <button
                    onClick={() => setSelectedAnimals([])}
                    className="ml-4 text-sm text-red-600 hover:text-red-800"
                  >
                    Очистить выбор
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAnimalSelector(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmAnimalSelection}
                  disabled={selectedAnimals.length === 0}
                  className={`px-4 py-2 rounded-md ${
                    selectedAnimals.length === 0 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Выбрать ({selectedAnimals.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Добавить ветеринарную операцию</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Животные</label>
                  <div className="mt-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowAnimalSelector(true)}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 flex items-center justify-center"
                    >
                      <Search size={18} className="mr-2" />
                      {selectedAnimals.length > 0 
                        ? `Выбрано животных: ${selectedAnimals.length}` 
                        : 'Выбрать животных'}
                    </button>
                  </div>
                  
                  {selectedAnimals.length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm font-medium text-gray-700 mb-1">Выбранные животные:</div>
                      <div className="max-h-24 overflow-y-auto p-2 bg-gray-50 rounded-md">
                        <div className="flex flex-wrap gap-2">
                          {selectedAnimals.map((animal, index) => (
                            <div 
                              key={animal.id}
                              className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                            >
                              <span>{animal.number}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAnimals(prev => prev.filter(a => a.id !== animal.id));
                                  if (index === 0 && selectedAnimals.length > 1) {
                                    // Если удаляем первое животное, устанавливаем следующее как основное
                                    setFormData(prev => ({
                                      ...prev,
                                      animalId: selectedAnimals[1].id
                                    }));
                                  }
                                }}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <option key={vet.id} value={vet.id}>
                        {vet.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Код операции</label>
                  <select
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите код операции</option>
                    {operationTypes.filter(type => type.code !== 'ПАДЕЖ').map(type => (
                      <option key={type.id} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                  <label className="block text-sm font-medium text-gray-700">Время</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Цена</label>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Использованные препараты</h3>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Добавить препарат
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedMedications.map((med, index) => 
                    renderMedicationSelection(med, index)
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Результат</label>
                <input
                  type="text"
                  name="result"
                  value={formData.result}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedMedications([]);
                    setSelectedAnimals([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={selectedAnimals.length === 0 || isLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center ${
                    (selectedAnimals.length === 0 || isLoading) ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Форма для регистрации падежа */}
      {showDeathForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-red-600">Регистрация падежа</h2>
              <button
                onClick={() => setShowDeathForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleDeathSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Животное</label>
                <select
                  value={selectedAnimalForDeath}
                  onChange={(e) => setSelectedAnimalForDeath(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите животное</option>
                  {animals
                    .filter(animal => animal.status !== 'Архив')
                    .map(animal => (
                      <option key={animal.id} value={animal.id}>
                        {animal.number}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Причина падежа</label>
                <textarea
                  value={deathReason}
                  onChange={(e) => setDeathReason(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  placeholder="Введите причину падежа"
                />
              </div>

              <div>
                <div className="flex items-center space-x-2 text-gray-500">
                  <span className="text-sm">Прикрепить фото вскрытия</span>
                  <button
                    type="button"
                    onClick={() => setPhotoAttached(!photoAttached)}
                    className="text-blue-600 hover:text-blue-800 cursor-not-allowed opacity-60 text-sm"
                    disabled
                  >
                    Функция будет добавлена позже
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeathForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                  disabled={!selectedAnimalForDeath || !deathReason || isLoading}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Регистрация...' : 'Зарегистрировать падеж'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showOperationCodesForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Управление кодами операций</h2>
              <button
                onClick={() => setShowOperationCodesForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (newOperationType.code && newOperationType.name) {
                setOperationTypes(prev => [
                  ...prev,
                  {
                    id: String(Date.now()),
                    ...newOperationType
                  }
                ]);
                setNewOperationType({
                  code: '',
                  name: '',
                  category: 'ТРАВМА_ОРТОПЕД'
                });
              }
            }} className="mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Код</label>
                  <input
                    type="text"
                    value={newOperationType.code}
                    onChange={(e) => setNewOperationType(prev => ({ ...prev, code: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Название</label>
                  <input
                    type="text"
                    value={newOperationType.name}
                    onChange={(e) => setNewOperationType(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Категория</label>
                  <select
                    value={newOperationType.category}
                    onChange={(e) => setNewOperationType(prev => ({ ...prev, category: e.target.value as OperationType['category'] }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="ТРАВМА_ОРТОПЕД">Травма/Ортопед</option>
                    <option value="ВАКЦИНАЦИЯ">Вакцинация</option>
                    <option value="ЛЕЧЕНИЕ">Лечение</option>
                    <option value="ОСМОТР">Осмотр</option>
                    <option value="ПАДЕЖ">Падеж</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Добавить код операции
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operationTypes.map((type) => (
                    <tr key={type.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{type.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setOperationTypes(prev => prev.filter(t => t.id !== type.id))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Подтверждение удаления</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Причина удаления
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  required
                  placeholder="Укажите причину удаления операции"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedOperationId(null);
                    setDeletionReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                  disabled={!deletionReason.trim() || isLoading}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения отмены операции падежа */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Отмена операции</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Причина отмены операции
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  required
                  placeholder="Укажите причину отмены операции"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setSelectedOperationId(null);
                    setCancellationReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={confirmCancel}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center"
                  disabled={!cancellationReason.trim() || isLoading}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Отмена операции...' : 'Отменить операцию'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTreatmentEndForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Завершение лечения</h2>
            <form onSubmit={handleTreatmentEndSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Ответственный за выписку</label>
                <select
                  value={treatmentEndExecutor}
                  onChange={(e) => setTreatmentEndExecutor(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Выберите ответственного</option>
                  {veterinarians.map(vet => (
                    <option key={vet.id} value={vet.id}>{vet.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Примечания</label>
                <textarea
                  value={treatmentEndNotes}
                  onChange={(e) => setTreatmentEndNotes(e.target.value)}
                  rows={3}
                  className="mt-1  block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTreatmentEndForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isLoading ? 'Завершение...' : 'Завершить лечение'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Отчет по ветеринарным операциям</h2>
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
            
            <div className="bg-gray-50 p-4 mb-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата начала</label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Дата окончания</label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Поиск</label>
                  <input
                    type="text"
                    value={reportFilters.searchTerm}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    placeholder="Поиск по номеру, коду, исполнителю..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Животное</label>
                  <select
                    value={reportFilters.animalId}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, animalId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все животные</option>
                    {animals.map(animal => (
                      <option key={animal.id} value={animal.id}>{animal.number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Исполнитель</label>
                  <select
                    value={reportFilters.executorId}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, executorId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все исполнители</option>
                    {veterinarians.map(vet => (
                      <option key={vet.id} value={vet.id}>{vet.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Код операции</label>
                  <select
                    value={reportFilters.operationCode}
                    onChange={(e) => setReportFilters(prev => ({ ...prev, operationCode: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все коды</option>
                    {operationTypes.map(type => (
                      <option key={type.id} value={type.code}>{type.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto bg-white p-4 border rounded-lg">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Отчет по ветеринарным операциям"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исполнитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Препараты</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Результат</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.map(operation => {
                const executor = veterinarians.find(v => v.id === operation.executorId);
                const animal = animals.find(a => a.id === operation.animalId);
                
                return (
                  <tr key={operation.id} 
                      className={operation.isCancelled ? 'bg-yellow-50' : 
                                 operation.isDeleted ? 'bg-red-50' : 
                                 operation.code === 'ПАДЕЖ' ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{operation.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{operation.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal?.number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operation.code === 'ПАДЕЖ' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          ПАДЕЖ
                        </span>
                      ) : (
                        operation.code
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{operation.price}₽</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{executor?.fullName}</td>
                    {renderMedicationsCell(operation.medications)}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{operation.result}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {operation.isCancelled ? (
                        <div>
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            Отменено
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {operation.cancellationReason}
                          </p>
                          <p className="text-xs text-gray-500">
                            {operation.cancellationDate ? format(new Date(operation.cancellationDate), 'dd.MM.yyyy') : ''}
                          </p>
                        </div>
                      ) : operation.isDeleted ? (
                        <div>
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Удалено
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {operation.deletionReason}
                          </p>
                          <p className="text-xs text-gray-500">
                            {operation.deletionDate}
                          </p>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleDelete(operation.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Удалить операцию"
                          >
                            <Trash2 size={18} />
                          </button>
                          {animal?.isUnderTreatment && operation.code !== 'ВАКЦИНАЦИЯ' && operation.code !== 'ПАДЕЖ' && (
                            <button
                              onClick={() => handleEndTreatment(animal.id)}
                              className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                            >
                              Завершить лечение
                            </button>
                          )}
                          {operation.code === 'ПАДЕЖ' && (
                            <button
                              onClick={() => handleCancel(operation.id)}
                              className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            >
                              Отменить
                            </button>
                          )}
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
    </div>
  );
};

export default VetOperations;