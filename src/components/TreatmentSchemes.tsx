import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, X, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Printer, Filter, Calendar, Clock, User, Activity, Clock4 } from 'lucide-react';
import { useVetOperations, TreatmentScheme, TreatmentStep, MedicationUsage, ActiveTreatment } from '../contexts/VetOperationsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useMedications } from '../contexts/MedicationsContext';
import { useNomenclature } from '../contexts/NomenclatureContext';
import { useUser } from '../contexts/UserContext';
import { format, differenceInDays } from 'date-fns';

const TreatmentSchemes: React.FC = () => {
  const { treatmentSchemes, activeTreatments, addTreatmentScheme, updateTreatmentScheme, deleteTreatmentScheme, startTreatment, completeStep, completeTreatment } = useVetOperations();
  const { animals } = useMovements();
  const { medications } = useMedications();
  const { items: nomenclatureItems } = useNomenclature();
  const { currentUser, users } = useUser();
  
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSchemeDetails, setShowSchemeDetails] = useState(false);
  const [showAddAnimalsForm, setShowAddAnimalsForm] = useState(false);
  const [showTreatmentDetails, setShowTreatmentDetails] = useState(false);
  const [showCompleteTreatmentForm, setShowCompleteTreatmentForm] = useState(false);
  const [showCompleteStepForm, setShowCompleteStepForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [selectedScheme, setSelectedScheme] = useState<TreatmentScheme | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<ActiveTreatment | null>(null);
  const [selectedStep, setSelectedStep] = useState<TreatmentStep | null>(null);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [completionType, setCompletionType] = useState<'discharge' | 'disposal'>('discharge');
  const [completionComment, setCompletionComment] = useState('');
  const [stepResult, setStepResult] = useState('');
  
  // Состояние для пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  const [animalGroupFilter, setAnimalGroupFilter] = useState('');
  const [animalStatusFilter, setAnimalStatusFilter] = useState('');
  
  // Состояние для фильтров отчета
  const [reportFilters, setReportFilters] = useState({
    dateFrom: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    animalNumber: '',
    schemeId: '',
    executorId: ''
  });
  
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  
  const [formData, setFormData] = useState<TreatmentScheme>({
    id: '',
    name: '',
    description: '',
    supervisorId: currentUser?.id || '',
    steps: [],
    isActive: true
  });
  
  // Фильтрация животных с учетом поиска, группы и статуса
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.number.toLowerCase().includes(animalSearchTerm.toLowerCase());
    const matchesGroup = !animalGroupFilter || animal.groupId === animalGroupFilter;
    const matchesStatus = !animalStatusFilter || animal.status === animalStatusFilter;
    return matchesSearch && matchesGroup && matchesStatus;
  });
  
  // Пагинация животных
  const indexOfLastAnimal = currentPage * itemsPerPage;
  const indexOfFirstAnimal = indexOfLastAnimal - itemsPerPage;
  const currentAnimals = filteredAnimals.slice(indexOfFirstAnimal, indexOfLastAnimal);
  const totalPages = Math.ceil(filteredAnimals.length / itemsPerPage);
  
  // Изменение страницы
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Переход к первой/последней странице
  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  
  // Переход к предыдущей/следующей странице
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  
  // Сброс пагинации при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [animalSearchTerm, animalGroupFilter, animalStatusFilter, itemsPerPage]);
  
  // Выбор всех животных на текущей странице
  const selectAllOnPage = () => {
    const allPageIds = currentAnimals.map(animal => animal.id);
    setSelectedAnimals(prev => {
      const newSelection = [...prev];
      allPageIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };
  
  // Снятие выбора со всех животных на текущей странице
  const deselectAllOnPage = () => {
    const allPageIds = currentAnimals.map(animal => animal.id);
    setSelectedAnimals(prev => prev.filter(id => !allPageIds.includes(id)));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: crypto.randomUUID(),
          day: prev.steps.length > 0 ? prev.steps[prev.steps.length - 1].day + 1 : 1,
          procedure: '',
          medications: []
        }
      ]
    }));
  };
  
  const handleRemoveStep = (stepIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, index) => index !== stepIndex)
    }));
  };
  
  const handleStepChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };
  
  const handleAddMedication = (stepIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === stepIndex ? {
          ...step,
          medications: [
            ...step.medications,
            {
              medicationId: '',
              quantity: 1,
              totalPrice: 0
            }
          ]
        } : step
      )
    }));
  };
  
  const handleRemoveMedication = (stepIndex: number, medIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === stepIndex ? {
          ...step,
          medications: step.medications.filter((_, j) => j !== medIndex)
        } : step
      )
    }));
  };
  
  const handleMedicationChange = (stepIndex: number, medIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === stepIndex ? {
          ...step,
          medications: step.medications.map((med, j) => 
            j === medIndex ? { ...med, [field]: value } : med
          )
        } : step
      )
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedScheme) {
      // Обновление существующей схемы
      updateTreatmentScheme(selectedScheme.id, formData);
    } else {
      // Добавление новой схемы
      addTreatmentScheme(formData);
    }
    
    setShowForm(false);
    setSelectedScheme(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      supervisorId: currentUser?.id || '',
      steps: [],
      isActive: true
    });
  };
  
  const handleEditScheme = (scheme: TreatmentScheme) => {
    setSelectedScheme(scheme);
    setFormData(scheme);
    setShowForm(true);
  };
  
  const handleDeleteScheme = (scheme: TreatmentScheme) => {
    setSelectedScheme(scheme);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteScheme = () => {
    if (selectedScheme) {
      deleteTreatmentScheme(selectedScheme.id);
      setShowDeleteConfirm(false);
      setSelectedScheme(null);
    }
  };
  
  const handleViewScheme = (scheme: TreatmentScheme) => {
    setSelectedScheme(scheme);
    setShowSchemeDetails(true);
  };
  
  const handleAddAnimals = (scheme: TreatmentScheme) => {
    setSelectedScheme(scheme);
    setSelectedAnimals([]);
    setShowAddAnimalsForm(true);
  };
  
  const handleStartTreatments = async () => {
    if (selectedScheme && selectedAnimals.length > 0) {
      for (const animalId of selectedAnimals) {
        await startTreatment(selectedScheme.id, animalId);
      }
      setShowAddAnimalsForm(false);
      setSelectedAnimals([]);
    }
  };
  
  const handleViewTreatment = (treatment: ActiveTreatment) => {
    setSelectedTreatment(treatment);
    setShowTreatmentDetails(true);
  };
  
  const handleCompleteTreatment = (treatment: ActiveTreatment) => {
    setSelectedTreatment(treatment);
    setCompletionType('discharge');
    setCompletionComment('');
    setShowCompleteTreatmentForm(true);
  };
  
  const confirmCompleteTreatment = async () => {
    if (selectedTreatment) {
      await completeTreatment(selectedTreatment.id, completionType, completionComment);
      setShowCompleteTreatmentForm(false);
      setSelectedTreatment(null);
    }
  };
  
  const handleCompleteStep = (treatment: ActiveTreatment, step: TreatmentStep) => {
    setSelectedTreatment(treatment);
    setSelectedStep(step);
    setStepResult('');
    setShowCompleteStepForm(true);
  };
  
  const confirmCompleteStep = async () => {
    if (selectedTreatment && selectedStep && currentUser) {
      await completeStep(selectedTreatment.id, selectedStep.id, stepResult, currentUser.id);
      setShowCompleteStepForm(false);
      setSelectedTreatment(null);
      setSelectedStep(null);
    }
  };
  
  const toggleAnimalSelection = (animalId: string) => {
    setSelectedAnimals(prev => 
      prev.includes(animalId) 
        ? prev.filter(id => id !== animalId) 
        : [...prev, animalId]
    );
  };
  
  // Функция для получения имени пользователя по ID
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'Неизвестный пользователь';
  };
  
  // Функция для получения номера животного по ID
  const getAnimalNumber = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.number : 'Неизвестное животное';
  };
  
  // Функция для получения названия схемы по ID
  const getSchemeName = (schemeId: string) => {
    const scheme = treatmentSchemes.find(s => s.id === schemeId);
    return scheme ? scheme.name : 'Неизвестная схема';
  };
  
  // Функция для получения названия препарата по ID
  const getMedicationName = (medicationId: string) => {
    const medication = medications.find(m => m.id === medicationId);
    if (!medication) return 'Неизвестный препарат';
    
    const nomenclature = nomenclatureItems.find(n => n.id === medication.nomenclatureId);
    return nomenclature ? nomenclature.name : 'Неизвестный препарат';
  };
  
  // Функция для получения активных лечений по схеме
  const getActiveTreatmentsByScheme = (schemeId: string) => {
    return activeTreatments.filter(t => t.schemeId === schemeId && !t.isCompleted);
  };
  
  // Функция для получения текущего этапа лечения
  const getCurrentStep = (treatment: ActiveTreatment) => {
    const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
    if (!scheme) return null;
    
    return scheme.steps[treatment.currentStep];
  };
  
  // Функция для проверки, выполнен ли этап
  const isStepCompleted = (treatment: ActiveTreatment, stepId: string) => {
    return treatment.completedSteps.some(cs => cs.stepId === stepId);
  };
  
  // Функция для получения даты выполнения этапа
  const getStepCompletionDate = (treatment: ActiveTreatment, stepId: string) => {
    const completedStep = treatment.completedSteps.find(cs => cs.stepId === stepId);
    return completedStep ? completedStep.date : null;
  };
  
  // Функция для получения исполнителя этапа
  const getStepExecutor = (treatment: ActiveTreatment, stepId: string) => {
    const completedStep = treatment.completedSteps.find(cs => cs.stepId === stepId);
    return completedStep ? getUserName(completedStep.executorId) : null;
  };
  
  // Функция для получения результата выполнения этапа
  const getStepResult = (treatment: ActiveTreatment, stepId: string) => {
    const completedStep = treatment.completedSteps.find(cs => cs.stepId === stepId);
    return completedStep ? completedStep.result : null;
  };
  
  // Функция для получения количества дней на лечении
  const getDaysInTreatment = (treatment: ActiveTreatment) => {
    return differenceInDays(new Date(), new Date(treatment.startDate));
  };
  
  // Обработчик изменения фильтров отчета
  const handleReportFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Функция для печати отчета
  const handlePrintReport = () => {
    if (printFrameRef.current && printFrameRef.current.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };
  
  // Функция для генерации HTML отчета
  const generateReportHTML = () => {
    // Фильтрация активных лечений по заданным параметрам
    const filteredTreatments = activeTreatments.filter(treatment => {
      // Фильтр по дате начала лечения
      const treatmentDate = new Date(treatment.startDate);
      const fromDate = new Date(reportFilters.dateFrom);
      const toDate = new Date(reportFilters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Устанавливаем конец дня для корректного сравнения
      
      const dateInRange = treatmentDate >= fromDate && treatmentDate <= toDate;
      
      // Фильтр по номеру животного
      const animalNumber = getAnimalNumber(treatment.animalId);
      const matchesAnimal = !reportFilters.animalNumber || 
                           animalNumber.toLowerCase().includes(reportFilters.animalNumber.toLowerCase());
      
      // Фильтр по схеме лечения
      const matchesScheme = !reportFilters.schemeId || treatment.schemeId === reportFilters.schemeId;
      
      // Фильтр по исполнителю (проверяем в completedSteps)
      const matchesExecutor = !reportFilters.executorId || 
                             treatment.completedSteps.some(step => step.executorId === reportFilters.executorId);
      
      return dateInRange && matchesAnimal && matchesScheme && matchesExecutor;
    });
    
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по схемам лечения</title>
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
          <div class="report-title">ОТЧЕТ ПО СХЕМАМ ЛЕЧЕНИЯ</div>
          <div class="report-date">за период с ${format(new Date(reportFilters.dateFrom), 'dd.MM.yyyy')} по ${format(new Date(reportFilters.dateTo), 'dd.MM.yyyy')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Время</th>
              <th>№ животного</th>
              <th>Код</th>
              <th>Этап схемы</th>
              <th>Исполнитель</th>
              <th>Дней на лечении</th>
              <th>Схема лечения</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTreatments.map((treatment, index) => {
              const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
              const currentStep = getCurrentStep(treatment);
              const animalNumber = getAnimalNumber(treatment.animalId);
              const daysInTreatment = getDaysInTreatment(treatment);
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${format(new Date(treatment.startDate), 'dd.MM.yyyy')}</td>
                  <td>00:00</td>
                  <td>${animalNumber}</td>
                  <td>${currentStep ? `День ${currentStep.day}` : '-'}</td>
                  <td>${currentStep ? currentStep.procedure : '-'}</td>
                  <td>${treatment.completedSteps.length > 0 ? 
                      getUserName(treatment.completedSteps[treatment.completedSteps.length - 1].executorId) : 
                      '-'}</td>
                  <td>${daysInTreatment}</td>
                  <td>${scheme ? scheme.name : 'Неизвестная схема'}</td>
                  <td>${treatment.isCompleted ? 
                      (treatment.completionType === 'discharge' ? 'Выписано' : 'Выбыло') : 
                      'На лечении'}</td>
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Схемы лечения</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => {
              setSelectedScheme(null);
              setFormData({
                id: '',
                name: '',
                description: '',
                supervisorId: currentUser?.id || '',
                steps: [],
                isActive: true
              });
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Добавить схему
          </button>
        </div>
      </div>

      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Отчет по схемам лечения</h2>
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
            
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-medium mb-3">Фильтры</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата с</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="dateFrom"
                      value={reportFilters.dateFrom}
                      onChange={handleReportFilterChange}
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата по</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="dateTo"
                      value={reportFilters.dateTo}
                      onChange={handleReportFilterChange}
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">№ животного</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="animalNumber"
                      value={reportFilters.animalNumber}
                      onChange={handleReportFilterChange}
                      placeholder="Поиск по номеру"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Схема лечения</label>
                  <select
                    name="schemeId"
                    value={reportFilters.schemeId}
                    onChange={handleReportFilterChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все схемы</option>
                    {treatmentSchemes.map(scheme => (
                      <option key={scheme.id} value={scheme.id}>{scheme.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель</label>
                  <select
                    name="executorId"
                    value={reportFilters.executorId}
                    onChange={handleReportFilterChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все исполнители</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto bg-gray-50 p-4">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
                title="Отчет по схемам лечения"
              />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {selectedScheme ? 'Редактировать схему лечения' : 'Добавить схему лечения'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Название схемы</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ответственный</label>
                  <select
                    name="supervisorId"
                    value={formData.supervisorId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Выберите ответственного</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Описание</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Этапы лечения</label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Добавить этап
                  </button>
                </div>
                
                {formData.steps.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-md">
                    <p className="text-gray-500">Нет добавленных этапов. Добавьте этап, чтобы начать.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.steps.map((step, stepIndex) => (
                      <div key={step.id} className="border rounded-md p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-md font-medium">Этап {stepIndex + 1}</h3>
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(stepIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">День</label>
                            <input
                              type="number"
                              value={step.day}
                              onChange={(e) => handleStepChange(stepIndex, 'day', parseInt(e.target.value))}
                              min="1"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Процедура</label>
                            <input
                              type="text"
                              value={step.procedure}
                              onChange={(e) => handleStepChange(stepIndex, 'procedure', e.target.value)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Препараты</label>
                            <button
                              type="button"
                              onClick={() => handleAddMedication(stepIndex)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                            >
                              <Plus size={16} className="mr-1" />
                              Добавить препарат
                            </button>
                          </div>
                          
                          {step.medications.length === 0 ? (
                            <div className="text-center py-4 bg-gray-100 rounded-md">
                              <p className="text-gray-500 text-sm">Нет добавленных препаратов</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {step.medications.map((med, medIndex) => (
                                <div key={medIndex} className="flex items-center space-x-3 bg-white p-2 rounded-md">
                                  <div className="flex-grow">
                                    <select
                                      value={med.medicationId}
                                      onChange={(e) => handleMedicationChange(stepIndex, medIndex, 'medicationId', e.target.value)}
                                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                      required
                                    >
                                      <option value="">Выберите препарат</option>
                                      {medications.map(medication => {
                                        const nomenclature = nomenclatureItems.find(n => n.id === medication.nomenclatureId);
                                        return (
                                          <option key={medication.id} value={medication.id}>
                                            {nomenclature?.name} ({medication.remainingQuantity} {nomenclature?.unit})
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                  <div className="w-20">
                                    <input
                                      type="number"
                                      value={med.quantity}
                                      onChange={(e) => handleMedicationChange(stepIndex, medIndex, 'quantity', parseInt(e.target.value))}
                                      min="1"
                                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                      required
                                    />
                                  </div>
                                  <div className="w-24">
                                    <input
                                      type="number"
                                      value={med.totalPrice}
                                      onChange={(e) => handleMedicationChange(stepIndex, medIndex, 'totalPrice', parseFloat(e.target.value))}
                                      min="0"
                                      step="0.01"
                                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                      required
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedication(stepIndex, medIndex)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedScheme(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {selectedScheme ? 'Сохранить изменения' : 'Добавить схему'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedScheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Подтверждение удаления</h2>
            <p className="mb-4">
              Вы уверены, что хотите удалить схему лечения "{selectedScheme.name}"? Это действие нельзя будет отменить.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDeleteScheme}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {showSchemeDetails && selectedScheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{selectedScheme.name}</h2>
              <button
                onClick={() => setShowSchemeDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-md font-medium mb-2">Описание</h3>
                <p className="text-gray-700">{selectedScheme.description || 'Нет описания'}</p>
              </div>
              <div>
                <h3 className="text-md font-medium mb-2">Ответственный</h3>
                <p className="text-gray-700">{getUserName(selectedScheme.supervisorId)}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Этапы лечения</h3>
              {selectedScheme.steps.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Нет добавленных этапов</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedScheme.steps.map((step, index) => (
                    <div key={step.id} className="border rounded-md p-4 bg-gray-50">
                      <h4 className="font-medium mb-2">День {step.day}: {step.procedure}</h4>
                      
                      {step.medications.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Препараты:</h5>
                          <ul className="space-y-1">
                            {step.medications.map((med, medIndex) => (
                              <li key={medIndex} className="text-sm text-gray-600">
                                {getMedicationName(med.medicationId)} - {med.quantity} ед. ({med.totalPrice} руб.)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-medium">Активные лечения</h3>
                <button
                  onClick={() => handleAddAnimals(selectedScheme)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Добавить животных
                </button>
              </div>
              
              {getActiveTreatmentsByScheme(selectedScheme.id).length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Нет активных лечений по данной схеме</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата начала</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Текущий этап</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дней на лечении</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getActiveTreatmentsByScheme(selectedScheme.id).map(treatment => {
                        const currentStep = getCurrentStep(treatment);
                        const animalNumber = getAnimalNumber(treatment.animalId);
                        const daysInTreatment = getDaysInTreatment(treatment);
                        
                        return (
                          <tr key={treatment.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animalNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(treatment.startDate), 'dd.MM.yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {currentStep ? `День ${currentStep.day}: ${currentStep.procedure}` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{daysInTreatment}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                              <button
                                onClick={() => handleViewTreatment(treatment)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Просмотреть детали"
                              >
                                <Search size={18} />
                              </button>
                              {currentStep && (
                                <button
                                  onClick={() => handleCompleteStep(treatment, currentStep)}
                                  className="text-green-600 hover:text-green-800"
                                  title="Выполнить текущий этап"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleCompleteTreatment(treatment)}
                                className="text-purple-600 hover:text-purple-800"
                                title="Завершить лечение"
                              >
                                <Activity size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowSchemeDetails(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAnimalsForm && selectedScheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Добавить животных в схему "{selectedScheme.name}"</h2>
              <button
                onClick={() => {
                  setShowAddAnimalsForm(false);
                  setSelectedAnimals([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Поиск по номеру</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={animalSearchTerm}
                      onChange={(e) => setAnimalSearchTerm(e.target.value)}
                      placeholder="Введите номер животного"
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
                  <select
                    value={animalGroupFilter}
                    onChange={(e) => setAnimalGroupFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все группы</option>
                    {/* Здесь должны быть опции групп */}
                  </select>
                </div>
                
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                  <select
                    value={animalStatusFilter}
                    onChange={(e) => setAnimalStatusFilter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Все статусы</option>
                    <option value="Без">Без</option>
                    <option value="Молоз">Молоз</option>
                    <option value="Осем">Осем</option>
                    <option value="Стел">Стел</option>
                    {/* Другие статусы */}
                  </select>
                </div>
                
                <div className="w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Записей на странице</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllOnPage}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Выбрать все на странице
                  </button>
                  <button
                    onClick={deselectAllOnPage}
                    className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Снять выбор
                  </button>
                </div>
              </div>
            </div>
            
            {selectedAnimals.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-medium text-blue-800">Выбрано животных: {selectedAnimals.length}</h3>
                  <button
                    onClick={() => setSelectedAnimals([])}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Очистить выбор
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedAnimals.map(animalId => {
                    const animal = animals.find(a => a.id === animalId);
                    return animal ? (
                      <div key={animalId} className="bg-white px-3 py-1 rounded-full border border-blue-200 flex items-center">
                        <span className="text-sm text-blue-800">{animal.number}</span>
                        <button
                          onClick={() => toggleAnimalSelection(animalId)}
                          className="ml-2 text-blue-400 hover:text-blue-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Выбор</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">№ животного</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Группа</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentAnimals.map(animal => (
                    <tr key={animal.id} className={selectedAnimals.includes(animal.id) ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAnimals.includes(animal.id)}
                          onChange={() => toggleAnimalSelection(animal.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{animal.number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Здесь должно быть название группы */}
                        Группа {animal.groupId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          animal.isUnderTreatment ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {animal.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Пагинация */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Показано {indexOfFirstAnimal + 1}-{Math.min(indexOfLastAnimal, filteredAnimals.length)} из {filteredAnimals.length} записей
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToFirstPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${
                    currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${
                    currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 py-1 text-sm">
                  Страница {currentPage} из {totalPages || 1}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`p-2 rounded ${
                    currentPage === totalPages || totalPages === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={goToLastPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className={`p-2 rounded ${
                    currentPage === totalPages || totalPages === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddAnimalsForm(false);
                  setSelectedAnimals([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleStartTreatments}
                disabled={selectedAnimals.length === 0}
                className={`px-4 py-2 rounded-md ${
                  selectedAnimals.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Начать лечение ({selectedAnimals.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showTreatmentDetails && selectedTreatment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">Детали лечения</h2>
                <p className="text-gray-600">Животное №{getAnimalNumber(selectedTreatment.animalId)}</p>
              </div>
              <button
                onClick={() => {
                  setShowTreatmentDetails(false);
                  setSelectedTreatment(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium mb-2">Информация о лечении</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Схема лечения:</span>
                    <p className="text-gray-900">{getSchemeName(selectedTreatment.schemeId)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Дата начала:</span>
                    <p className="text-gray-900">{format(new Date(selectedTreatment.startDate), 'dd.MM.yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Дней на лечении:</span>
                    <p className="text-gray-900">{getDaysInTreatment(selectedTreatment)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Текущий этап:</span>
                    <p className="text-gray-900">{selectedTreatment.currentStep + 1}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Статус:</span>
                    <p className="text-gray-900">
                      {selectedTreatment.isCompleted 
                        ? (selectedTreatment.completionType === 'discharge' ? 'Выписано' : 'Выбыло') 
                        : 'На лечении'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                <h3 className="text-md font-medium mb-2">Текущий этап</h3>
                {getCurrentStep(selectedTreatment) ? (
                  <div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">День:</span>
                      <p className="text-gray-900">{getCurrentStep(selectedTreatment)?.day}</p>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">Процедура:</span>
                      <p className="text-gray-900">{getCurrentStep(selectedTreatment)?.procedure}</p>
                    </div>
                    {getCurrentStep(selectedTreatment)?.medications.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-500">Препараты:</span>
                        <ul className="list-disc list-inside text-gray-900 mt-1">
                          {getCurrentStep(selectedTreatment)?.medications.map((med, index) => (
                            <li key={index}>
                              {getMedicationName(med.medicationId)} - {med.quantity} ед.
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Нет активного этапа</p>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">История этапов</h3>
              {selectedTreatment.completedSteps.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Нет выполненных этапов</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Этап</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата выполнения</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Исполнитель</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Результат</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedTreatment.completedSteps.map((completedStep, index) => {
                        const scheme = treatmentSchemes.find(s => s.id === selectedTreatment.schemeId);
                        const step = scheme?.steps.find(s => s.id === completedStep.stepId);
                        
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {step ? `День ${step.day}: ${step.procedure}` : 'Неизвестный этап'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(completedStep.date), 'dd.MM.yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getUserName(completedStep.executorId)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {completedStep.result}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {selectedTreatment.isCompleted && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-md font-medium mb-2">Информация о завершении</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Дата завершения:</span>
                    <p className="text-gray-900">
                      {selectedTreatment.completionDate ? format(new Date(selectedTreatment.completionDate), 'dd.MM.yyyy') : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Тип завершения:</span>
                    <p className="text-gray-900">
                      {selectedTreatment.completionType === 'discharge' ? 'Выписка' : 'Выбытие'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-500">Комментарий:</span>
                    <p className="text-gray-900">{selectedTreatment.completionComment || '-'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              {!selectedTreatment.isCompleted && (
                <>
                  {getCurrentStep(selectedTreatment) && (
                    <button
                      onClick={() => {
                        const currentStep = getCurrentStep(selectedTreatment);
                        if (currentStep) {
                          handleCompleteStep(selectedTreatment, currentStep);
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Выполнить текущий этап
                    </button>
                  )}
                  <button
                    onClick={() => handleCompleteTreatment(selectedTreatment)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Завершить лечение
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowTreatmentDetails(false);
                  setSelectedTreatment(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteTreatmentForm && selectedTreatment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Завершение лечения</h2>
            <p className="mb-4">
              Животное №{getAnimalNumber(selectedTreatment.animalId)}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Тип завершения</label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <input
                      id="discharge"
                      type="radio"
                      name="completionType"
                      value="discharge"
                      checked={completionType === 'discharge'}
                      onChange={() => setCompletionType('discharge')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="discharge" className="ml-2 text-sm text-gray-700">
                      Выписка (животное здорово)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="disposal"
                      type="radio"
                      name="completionType"
                      value="disposal"
                      checked={completionType === 'disposal'}
                      onChange={() => setCompletionType('disposal')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="disposal" className="ml-2 text-sm text-gray-700">
                      Выбытие (животное переведено в архив)
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Комментарий</label>
                <textarea
                  value={completionComment}
                  onChange={(e) => setCompletionComment(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteTreatmentForm(false);
                  setSelectedTreatment(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmCompleteTreatment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Завершить лечение
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteStepForm && selectedTreatment && selectedStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Выполнение этапа лечения</h2>
            <div className="mb-4">
              <p className="text-gray-700">
                Животное №{getAnimalNumber(selectedTreatment.animalId)}
              </p>
              <p className="text-gray-700">
                Этап: День {selectedStep.day} - {selectedStep.procedure}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Результат выполнения</label>
              <textarea
                value={stepResult}
                onChange={(e) => setStepResult(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteStepForm(false);
                  setSelectedTreatment(null);
                  setSelectedStep(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmCompleteStep}
                disabled={!stepResult.trim()}
                className={`px-4 py-2 rounded-md ${
                  !stepResult.trim() 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Выполнить этап
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
                placeholder="Поиск по названию схемы..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ответственный</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Этапов</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Активных лечений</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {treatmentSchemes
                .filter(scheme => scheme.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(scheme => (
                  <tr key={scheme.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{scheme.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {scheme.description ? (
                        scheme.description.length > 50 
                          ? `${scheme.description.substring(0, 50)}...` 
                          : scheme.description
                      ) : (
                        <span className="text-gray-400">Нет описания</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getUserName(scheme.supervisorId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {scheme.steps.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getActiveTreatmentsByScheme(scheme.id).length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        scheme.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {scheme.isActive ? 'Активна' : 'Неактивна'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <button
                        onClick={() => handleViewScheme(scheme)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Просмотреть детали"
                      >
                        <Search size={18} />
                      </button>
                      <button
                        onClick={() => handleEditScheme(scheme)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Редактировать"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleAddAnimals(scheme)}
                        className="text-green-600 hover:text-green-800"
                        title="Добавить животных"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteScheme(scheme)}
                        className="text-red-600 hover:text-red-800"
                        title="Удалить"
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
  );
};

export default TreatmentSchemes;