import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash, 
  X, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  Check, 
  FileText, 
  Clock,
  AlertCircle,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info
} from 'lucide-react';
import { format, parseISO, isPast, isToday, isFuture, startOfDay } from 'date-fns';
import { usePlannedOperations, 
  OperationType, 
  operationTypeLabels, 
  operationTypeColors, 
  OperationTemplate,
  OperationStep,
  conditionLabels,
  ScheduledOperation 
} from '../contexts/PlannedOperationsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useGroups } from '../contexts/GroupsContext';

const PlannedOperations: React.FC = () => {
  // Контексты
  const { 
    templates, 
    steps, 
    assignedPlans,
    scheduledOperations,
    isLoading, 
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createStep,
    updateStep,
    deleteStep,
    assignPlan,
    assignPlanToMultipleAnimals,
    completePlan,
    deletePlan,
    completeOperation,
    getTemplateSteps,
    getOverdueOperations,
    getTodayOperations,
    processOperationResult
  } = usePlannedOperations();
  
  const { animals } = useMovements();
  const { groups } = useGroups();

  // Состояния интерфейса
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showStepForm, setShowStepForm] = useState(false);
  const [showAssignPlanForm, setShowAssignPlanForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'animals'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Состояния форм
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    isActive: true
  });

  const [stepForm, setStepForm] = useState({
    templateId: '',
    name: '',
    operationType: 'INSEMINATION' as OperationType,
    daysAfterPrevious: 0,
    changeStatus: '',
    changeGroupId: '',
    description: '',
    sortOrder: 1,
    condition: 'ALWAYS' as 'ALWAYS' | 'POSITIVE' | 'NEGATIVE'
  });

  const [assignPlanForm, setAssignPlanForm] = useState({
    templateId: '',
    animalId: '',
    startDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Состояния для фильтрации животных
  const [animalSearchTerm, setAnimalSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  
  // Состояния для пагинации животных
  const [animalPage, setAnimalPage] = useState(1);
  const [animalsPerPage, setAnimalsPerPage] = useState(10);
  
  // Состояния для фильтрации операций
  const [operationSearchTerm, setOperationSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState<'all' | 'overdue' | 'today' | 'future' | 'completed'>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>('');
  
  // Состояния для пагинации операций
  const [operationPage, setOperationPage] = useState(1);
  const [operationsPerPage, setOperationsPerPage] = useState(10);
  
  // Состояния для выполнения операции
  const [showCompleteOperationForm, setShowCompleteOperationForm] = useState(false);
  const [operationResult, setOperationResult] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  const [operationNotes, setOperationNotes] = useState('');
  const [processingOperation, setProcessingOperation] = useState(false);
  
  // Состояния для отчета
  const [reportFilters, setReportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    group: '',
    template: ''
  });
  
  // Ссылка на фрейм для печати отчета
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  // Получение шагов для выбранного шаблона
  const templateSteps = selectedTemplate 
    ? steps.filter(step => step.templateId === selectedTemplate)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  // Обработка фильтрации животных
  const filteredAnimals = animals.filter(animal => 
    animal.number.toLowerCase().includes(animalSearchTerm.toLowerCase()) &&
    (selectedGroupFilter ? animal.groupId === selectedGroupFilter : true) &&
    (selectedStatusFilter ? animal.status === selectedStatusFilter : true)
  );
  
  // Уникальные статусы для фильтра
  const uniqueStatuses = [...new Set(animals.map(animal => animal.status))];
  
  // Пагинация животных
  const paginatedAnimals = filteredAnimals.slice(
    (animalPage - 1) * animalsPerPage,
    animalPage * animalsPerPage
  );
  const totalAnimalPages = Math.ceil(filteredAnimals.length / animalsPerPage);
  
  // Обработка фильтрации операций
  const filteredOperations = scheduledOperations.filter(operation => {
    const animal = animals.find(a => a.id === operation.animalId);
    const animalNumber = animal ? animal.number : '';
    const opTemplate = templates.find(t => t.id === assignedPlans.find(p => p.id === operation.planId)?.templateId);
    const templateName = opTemplate ? opTemplate.name : '';
    
    const matchesSearch = 
      animalNumber.toLowerCase().includes(operationSearchTerm.toLowerCase()) ||
      templateName.toLowerCase().includes(operationSearchTerm.toLowerCase());
    
    const matchesDateFilter = selectedDateFilter 
      ? operation.scheduledDate === selectedDateFilter
      : true;
      
    const matchesTemplateFilter = selectedTemplateFilter
      ? assignedPlans.find(p => p.id === operation.planId)?.templateId === selectedTemplateFilter
      : true;
      
    let matchesStatusFilter = true;
    switch (operationFilter) {
      case 'overdue':
        matchesStatusFilter = !operation.isCompleted && isPast(parseISO(operation.scheduledDate)) && !isToday(parseISO(operation.scheduledDate));
        break;
      case 'today':
        matchesStatusFilter = !operation.isCompleted && isToday(parseISO(operation.scheduledDate));
        break;
      case 'future':
        matchesStatusFilter = !operation.isCompleted && isFuture(parseISO(operation.scheduledDate));
        break;
      case 'completed':
        matchesStatusFilter = operation.isCompleted;
        break;
    }
    
    return matchesSearch && matchesDateFilter && matchesTemplateFilter && matchesStatusFilter;
  });
  
  // Пагинация операций
  const paginatedOperations = filteredOperations.slice(
    (operationPage - 1) * operationsPerPage,
    operationPage * operationsPerPage
  );
  const totalOperationPages = Math.ceil(filteredOperations.length / operationsPerPage);
  
  // Получение просроченных и сегодняшних операций
  const overdueOperations = getOverdueOperations();
  const todayOperations = getTodayOperations();

  useEffect(() => {
    // Сброс пагинации при изменении фильтров
    setAnimalPage(1);
  }, [animalSearchTerm, selectedGroupFilter, selectedStatusFilter]);
  
  useEffect(() => {
    // Сброс пагинации при изменении фильтров операций
    setOperationPage(1);
  }, [operationSearchTerm, operationFilter, selectedDateFilter, selectedTemplateFilter]);

  // Сброс ошибок и сообщений об успехе через 5 секунд
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Сброс формы шага при изменении выбранного шаблона
  useEffect(() => {
    if (selectedTemplate) {
      setStepForm(prev => ({
        ...prev,
        templateId: selectedTemplate,
        sortOrder: templateSteps.length > 0 ? Math.max(...templateSteps.map(s => s.sortOrder)) + 1 : 1
      }));
    }
  }, [selectedTemplate, templateSteps]);

  // Обработчики форм
  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedTemplate) {
        await updateTemplate(selectedTemplate, templateForm);
        setSuccessMessage('Шаблон успешно обновлен');
      } else {
        const newTemplate = await createTemplate(templateForm);
        if (newTemplate) {
          setSelectedTemplate(newTemplate.id);
          setSuccessMessage('Шаблон успешно создан');
        }
      }
      
      setShowTemplateForm(false);
      setEditMode(false);
      setTemplateForm({
        name: '',
        description: '',
        isActive: true
      });
    } catch (err) {
      console.error('Ошибка при сохранении шаблона:', err);
      setErrorMessage(`Ошибка при сохранении шаблона: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleStepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем templateId перед отправкой
    if (!stepForm.templateId || stepForm.templateId.trim() === '') {
      setErrorMessage('Необходимо выбрать шаблон');
      return;
    }
    
    try {
      if (editMode && selectedOperation) {
        await updateStep(selectedOperation, stepForm);
        setSuccessMessage('Шаг успешно обновлен');
      } else {
        await createStep({
          ...stepForm,
          // Преобразуем пустые строки для UUID полей в null
          changeGroupId: stepForm.changeGroupId.trim() !== '' ? stepForm.changeGroupId : undefined
        });
        setSuccessMessage('Шаг успешно добавлен');
      }
      
      setShowStepForm(false);
      setEditMode(false);
      setStepForm({
        templateId: selectedTemplate || '',
        name: '',
        operationType: 'INSEMINATION',
        daysAfterPrevious: 0,
        changeStatus: '',
        changeGroupId: '',
        description: '',
        sortOrder: templateSteps.length > 0 ? Math.max(...templateSteps.map(s => s.sortOrder)) + 1 : 1,
        condition: 'ALWAYS'
      });
    } catch (err) {
      console.error('Ошибка при создании шага:', err);
      setErrorMessage(`Ошибка при создании шага: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedAnimals.length === 0) {
        if (!assignPlanForm.animalId) {
          setErrorMessage('Выберите хотя бы одно животное');
          return;
        }
        
        // Назначение плана одному животному
        await assignPlan({
          templateId: assignPlanForm.templateId,
          animalId: assignPlanForm.animalId,
          startDate: assignPlanForm.startDate
        });
        setSuccessMessage('План успешно назначен животному');
      } else {
        // Назначение плана нескольким животным
        await assignPlanToMultipleAnimals(
          assignPlanForm.templateId,
          selectedAnimals,
          assignPlanForm.startDate
        );
        setSuccessMessage(`План успешно назначен ${selectedAnimals.length} животным`);
      }
      
      setShowAssignPlanForm(false);
      setAssignPlanForm({
        templateId: '',
        animalId: '',
        startDate: format(new Date(), 'yyyy-MM-dd')
      });
      setSelectedAnimals([]);
    } catch (err) {
      console.error('Ошибка при назначении плана:', err);
      setErrorMessage(`Ошибка при назначении плана: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleCompleteOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOperation) return;
    
    try {
      setProcessingOperation(true);
      await processOperationResult(selectedOperation, operationResult);
      
      setSuccessMessage('Операция успешно выполнена');
      setShowCompleteOperationForm(false);
      setSelectedOperation(null);
      setOperationResult('POSITIVE');
      setOperationNotes('');
    } catch (err) {
      console.error('Ошибка при выполнении операции:', err);
      setErrorMessage(`Ошибка при выполнении операции: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setProcessingOperation(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await deleteTemplate(selectedTemplate);
      setSuccessMessage('Шаблон успешно удален');
      setShowDeleteConfirm(false);
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Ошибка при удалении шаблона:', err);
      setErrorMessage(`Ошибка при удалении шаблона: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteStep(stepId);
      setSuccessMessage('Шаг успешно удален');
    } catch (err) {
      console.error('Ошибка при удалении шага:', err);
      setErrorMessage(`Ошибка при удалении шага: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  // Получение информации о животном по ID
  const getAnimalInfo = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.number : 'Неизвестно';
  };

  // Получение информации о группе по ID
  const getGroupName = (groupId: string | undefined) => {
    if (!groupId) return '';
    const group = groups.find(g => g.id === groupId);
    return group ? group.number : '';
  };
  
  // Получение шаблона по ID
  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template ? template.name : 'Неизвестно';
  };
  
  // Функция для редактирования шаблона
  const editTemplate = (template: OperationTemplate) => {
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      isActive: template.isActive
    });
    setEditMode(true);
    setShowTemplateForm(true);
  };
  
  // Функция для редактирования шага
  const editStep = (step: OperationStep) => {
    setStepForm({
      templateId: step.templateId,
      name: step.name,
      operationType: step.operationType,
      daysAfterPrevious: step.daysAfterPrevious,
      changeStatus: step.changeStatus || '',
      changeGroupId: step.changeGroupId || '',
      description: step.description || '',
      sortOrder: step.sortOrder,
      condition: step.condition || 'ALWAYS'
    });
    setSelectedOperation(step.id);
    setEditMode(true);
    setShowStepForm(true);
  };
  
  // Проверяет, является ли операция просроченной
  const isOperationOverdue = (operation: ScheduledOperation) => {
    return !operation.isCompleted && isPast(parseISO(operation.scheduledDate)) && !isToday(parseISO(operation.scheduledDate));
  };
  
  // Проверяет, запланирована ли операция на сегодня
  const isOperationToday = (operation: ScheduledOperation) => {
    return !operation.isCompleted && isToday(parseISO(operation.scheduledDate));
  };
  
  // Функция для печати отчета
  const handlePrintReport = () => {
    if (printFrameRef.current?.contentWindow) {
      printFrameRef.current.contentWindow.print();
    }
  };
  
  // Обработчик выбора/отмены выбора животного
  const toggleAnimalSelection = (animalId: string) => {
    if (selectedAnimals.includes(animalId)) {
      setSelectedAnimals(selectedAnimals.filter(id => id !== animalId));
    } else {
      setSelectedAnimals([...selectedAnimals, animalId]);
    }
  };
  
  // Функция для выбора всех животных на текущей странице
  const selectAllAnimalsOnPage = () => {
    const animalIds = paginatedAnimals.map(animal => animal.id);
    // Объединяем с уже выбранными, но исключаем тех, которые на текущей странице
    const currentlySelected = selectedAnimals.filter(id => !paginatedAnimals.some(animal => animal.id === id));
    setSelectedAnimals([...currentlySelected, ...animalIds]);
  };
  
  // Функция для снятия выбора со всех животных на текущей странице
  const deselectAllAnimalsOnPage = () => {
    const animalIdsOnPage = paginatedAnimals.map(animal => animal.id);
    setSelectedAnimals(selectedAnimals.filter(id => !animalIdsOnPage.includes(id)));
  };
  
  // Генерация HTML для печати отчета
  const generateReportHTML = () => {
    // Получаем все операции, соответствующие фильтрам отчета
    const reportOperations = scheduledOperations.filter(operation => {
      let matchesFilters = true;
      
      // Фильтр по датам
      if (reportFilters.dateFrom && operation.scheduledDate < reportFilters.dateFrom) {
        matchesFilters = false;
      }
      
      if (reportFilters.dateTo && operation.scheduledDate > reportFilters.dateTo) {
        matchesFilters = false;
      }
      
      // Фильтр по шаблону
      if (reportFilters.template) {
        const plan = assignedPlans.find(p => p.id === operation.planId);
        if (!plan || plan.templateId !== reportFilters.template) {
          matchesFilters = false;
        }
      }
      
      // Фильтр по группе
      if (reportFilters.group) {
        const animal = animals.find(a => a.id === operation.animalId);
        if (!animal || animal.groupId !== reportFilters.group) {
          matchesFilters = false;
        }
      }
      
      // Фильтр по статусу
      if (reportFilters.status) {
        const animal = animals.find(a => a.id === operation.animalId);
        if (!animal || animal.status !== reportFilters.status) {
          matchesFilters = false;
        }
      }
      
      return matchesFilters;
    });
    
    // Разделяем операции по категориям
    const overdueOps = reportOperations.filter(op => 
      !op.isCompleted && isPast(parseISO(op.scheduledDate)) && !isToday(parseISO(op.scheduledDate))
    );
    
    const todayOps = reportOperations.filter(op => 
      !op.isCompleted && isToday(parseISO(op.scheduledDate))
    );
    
    const futureOps = reportOperations.filter(op => 
      !op.isCompleted && isFuture(parseISO(op.scheduledDate))
    );
    
    const completedOps = reportOperations.filter(op => op.isCompleted);
    
    return `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Отчет по плановым операциям</title>
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
          .report-filters {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
          }
          .section-header {
            margin-top: 30px;
            margin-bottom: 10px;
            font-size: 16px;
            font-weight: bold;
            color: #333;
          }
          .alert {
            padding: 5px;
            border-radius: 4px;
            margin-bottom: 10px;
            font-weight: bold;
          }
          .alert-danger {
            background-color: #ffeeee;
            color: #d30000;
          }
          .alert-warning {
            background-color: #fff8e1;
            color: #ff6d00;
          }
          .alert-success {
            background-color: #e6fffa;
            color: #00796b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
          }
          .insemination {
            background-color: #e3f2fd;
            color: #0d47a1;
          }
          .pregnancy-test {
            background-color: #f3e5f5;
            color: #6a1b9a;
          }
          .group-change {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          .status-change {
            background-color: #fff3e0;
            color: #e65100;
          }
          .calving {
            background-color: #ffebee;
            color: #b71c1c;
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
          <div class="report-title">ОТЧЕТ ПО ПЛАНОВЫМ ОПЕРАЦИЯМ</div>
          <div class="report-date">по состоянию на ${format(new Date(), 'dd.MM.yyyy')}</div>
        </div>
        
        <div class="report-filters">
          <strong>Примененные фильтры:</strong>
          <ul>
            ${reportFilters.dateFrom ? `<li>Дата от: ${reportFilters.dateFrom}</li>` : ''}
            ${reportFilters.dateTo ? `<li>Дата до: ${reportFilters.dateTo}</li>` : ''}
            ${reportFilters.template ? `<li>Шаблон: ${getTemplateName(reportFilters.template)}</li>` : ''}
            ${reportFilters.group ? `<li>Группа: ${getGroupName(reportFilters.group)}</li>` : ''}
            ${reportFilters.status ? `<li>Статус животного: ${reportFilters.status}</li>` : ''}
          </ul>
        </div>

        ${overdueOps.length > 0 ? `
          <div class="section-header">
            <div class="alert alert-danger">ПРОСРОЧЕННЫЕ ОПЕРАЦИИ (${overdueOps.length})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Животное</th>
                <th>Группа</th>
                <th>Статус</th>
                <th>Тип операции</th>
                <th>Шаблон</th>
                <th>Дней просрочки</th>
              </tr>
            </thead>
            <tbody>
              ${overdueOps.map((op, index) => {
                const animal = animals.find(a => a.id === op.animalId);
                const plan = assignedPlans.find(p => p.id === op.planId);
                const template = templates.find(t => t.id === plan?.templateId);
                const daysPast = differenceInDays(new Date(), parseISO(op.scheduledDate));

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${op.scheduledDate}</td>
                    <td>${animal ? animal.number : 'Неизвестно'}</td>
                    <td>${animal ? getGroupName(animal.groupId) : ''}</td>
                    <td>${animal ? animal.status : ''}</td>
                    <td>
                      <span class="status-badge ${op.operationType.toLowerCase()}">
                        ${operationTypeLabels[op.operationType]}
                      </span>
                    </td>
                    <td>${template ? template.name : 'Неизвестно'}</td>
                    <td>${daysPast}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

        ${todayOps.length > 0 ? `
          <div class="section-header">
            <div class="alert alert-warning">ОПЕРАЦИИ НА СЕГОДНЯ (${todayOps.length})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Животное</th>
                <th>Группа</th>
                <th>Статус</th>
                <th>Тип операции</th>
                <th>Шаблон</th>
                <th>Статус выполнения</th>
              </tr>
            </thead>
            <tbody>
              ${todayOps.map((op, index) => {
                const animal = animals.find(a => a.id === op.animalId);
                const plan = assignedPlans.find(p => p.id === op.planId);
                const template = templates.find(t => t.id === plan?.templateId);

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${animal ? animal.number : 'Неизвестно'}</td>
                    <td>${animal ? getGroupName(animal.groupId) : ''}</td>
                    <td>${animal ? animal.status : ''}</td>
                    <td>
                      <span class="status-badge ${op.operationType.toLowerCase()}">
                        ${operationTypeLabels[op.operationType]}
                      </span>
                    </td>
                    <td>${template ? template.name : 'Неизвестно'}</td>
                    <td>${op.isCompleted ? 'Выполнено' : 'Не выполнено'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${futureOps.length > 0 ? `
          <div class="section-header">
            <div class="alert">ЗАПЛАНИРОВАННЫЕ ОПЕРАЦИИ (${futureOps.length})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Животное</th>
                <th>Группа</th>
                <th>Тип операции</th>
                <th>Шаблон</th>
              </tr>
            </thead>
            <tbody>
              ${futureOps.map((op, index) => {
                const animal = animals.find(a => a.id === op.animalId);
                const plan = assignedPlans.find(p => p.id === op.planId);
                const template = templates.find(t => t.id === plan?.templateId);

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${op.scheduledDate}</td>
                    <td>${animal ? animal.number : 'Неизвестно'}</td>
                    <td>${animal ? getGroupName(animal.groupId) : ''}</td>
                    <td>
                      <span class="status-badge ${op.operationType.toLowerCase()}">
                        ${operationTypeLabels[op.operationType]}
                      </span>
                    </td>
                    <td>${template ? template.name : 'Неизвестно'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${completedOps.length > 0 ? `
          <div class="section-header">
            <div class="alert alert-success">ВЫПОЛНЕННЫЕ ОПЕРАЦИИ (${completedOps.length})</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Животное</th>
                <th>Группа</th>
                <th>Тип операции</th>
                <th>Шаблон</th>
                <th>Дата выполнения</th>
                <th>Результат</th>
              </tr>
            </thead>
            <tbody>
              ${completedOps.map((op, index) => {
                const animal = animals.find(a => a.id === op.animalId);
                const plan = assignedPlans.find(p => p.id === op.planId);
                const template = templates.find(t => t.id === plan?.templateId);

                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${op.scheduledDate}</td>
                    <td>${animal ? animal.number : 'Неизвестно'}</td>
                    <td>${animal ? getGroupName(animal.groupId) : ''}</td>
                    <td>
                      <span class="status-badge ${op.operationType.toLowerCase()}">
                        ${operationTypeLabels[op.operationType]}
                      </span>
                    </td>
                    <td>${template ? template.name : 'Неизвестно'}</td>
                    <td>${op.completedDate ? format(new Date(op.completedDate), 'dd.MM.yyyy') : '-'}</td>
                    <td>${op.result ? op.result : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        ` : ''}

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
  
  // Пагинация животных
  const goToAnimalPage = (page: number) => {
    setAnimalPage(Math.max(1, Math.min(page, totalAnimalPages)));
  };
  
  // Пагинация операций
  const goToOperationPage = (page: number) => {
    setOperationPage(Math.max(1, Math.min(page, totalOperationPages)));
  };
  
  // Получение процента выполненных операций для сегодняшних операций
  const getTodayCompletionPercentage = () => {
    if (todayOperations.length === 0) return 0;
    
    const completedCount = todayOperations.filter(op => op.isCompleted).length;
    return Math.round((completedCount / todayOperations.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Плановые операции</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <FileText size={20} className="mr-2" />
            Сформировать отчет
          </button>
          <button
            onClick={() => setShowAssignPlanForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Назначить план
          </button>
        </div>
      </div>
      
      {/* Сообщения об ошибках и успехе */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Табы */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'templates' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('templates')}
        >
          Шаблоны операций
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'animals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('animals')}
        >
          Запланированные операции
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-medium">Шаблоны</h2>
              <button
                onClick={() => {
                  setShowTemplateForm(true);
                  setEditMode(false);
                  setTemplateForm({
                    name: '',
                    description: '',
                    isActive: true
                  });
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Добавить шаблон
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Название
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Описание
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        Нет доступных шаблонов. Создайте новый шаблон.
                      </td>
                    </tr>
                  ) : (
                    templates.map(template => (
                      <tr 
                        key={template.id} 
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedTemplate === template.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {template.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {template.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {template.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              editTemplate(template);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTemplate(template.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTemplate && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="text-lg font-medium">Шаги шаблона</h2>
                <button
                  onClick={() => {
                    setShowStepForm(true);
                    setEditMode(false);
                    setStepForm({
                      templateId: selectedTemplate,
                      name: '',
                      operationType: 'INSEMINATION',
                      daysAfterPrevious: 0,
                      changeStatus: '',
                      changeGroupId: '',
                      description: '',
                      sortOrder: templateSteps.length > 0 ? Math.max(...templateSteps.map(s => s.sortOrder)) + 1 : 1,
                      condition: 'ALWAYS'
                    });
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Добавить шаг
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Порядок
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Тип операции
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дней после предыдущей
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Условие
                      </th>
                      <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templateSteps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          Нет шагов в шаблоне. Добавьте новый шаг.
                        </td>
                      </tr>
                    ) : (
                      templateSteps.map(step => (
                        <tr key={step.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {step.sortOrder}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {step.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${operationTypeColors[step.operationType]}`}>
                              {operationTypeLabels[step.operationType]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {step.daysAfterPrevious} дней
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {step.condition ? conditionLabels[step.condition] : 'Всегда'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-3">
                            <button
                              onClick={() => editStep(step)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteStep(step.id!)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'animals' && (
        <div className="space-y-6">
          {/* Сводка операций */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <AlertCircle className="h-10 w-10 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Просроченные</h3>
                    <p className="text-sm text-red-600">Требуют внимания</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-red-800">{overdueOperations.length}</span>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Calendar className="h-10 w-10 text-amber-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800">На сегодня</h3>
                    <p className="text-sm text-amber-600">Выполнено: {getTodayCompletionPercentage()}%</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-amber-800">{todayOperations.length}</span>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Clock className="h-10 w-10 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-800">Всего запланировано</h3>
                    <p className="text-sm text-blue-600">Активные планы</p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-blue-800">
                  {scheduledOperations.filter(op => !op.isCompleted).length}
                </span>
              </div>
            </div>
          </div>
          
          {/* Фильтры операций */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Поиск по номеру животного..."
                  value={operationSearchTerm}
                  onChange={(e) => setOperationSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <select 
                  value={operationFilter}
                  onChange={(e) => setOperationFilter(e.target.value as any)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">Все операции</option>
                  <option value="overdue">Просроченные</option>
                  <option value="today">На сегодня</option>
                  <option value="future">Будущие</option>
                  <option value="completed">Выполненные</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center space-x-2 whitespace-nowrap">
                <select
                  value={selectedTemplateFilter}
                  onChange={(e) => setSelectedTemplateFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Все шаблоны</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Список операций */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Животное
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Группа
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип операции
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Шаблон
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус выполнения
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Результат
                    </th>
                    <th className="px-6 py-3 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOperations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        Нет запланированных операций, соответствующих фильтрам.
                      </td>
                    </tr>
                  ) : (
                    paginatedOperations.map(operation => {
                      const animal = animals.find(a => a.id === operation.animalId);
                      const plan = assignedPlans.find(p => p.id === operation.planId);
                      const template = templates.find(t => t.id === plan?.templateId);
                      const isOverdue = isOperationOverdue(operation);
                      const isForToday = isOperationToday(operation);
                      
                      return (
                        <tr 
                          key={operation.id} 
                          className={`
                            ${operation.isCompleted ? 'bg-green-50' : ''} 
                            ${isOverdue ? 'bg-red-50' : ''} 
                            ${isForToday && !operation.isCompleted ? 'bg-amber-50' : ''}
                          `}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {operation.scheduledDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {animal ? animal.number : 'Неизвестно'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {animal ? getGroupName(animal.groupId) : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {animal ? animal.status : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${operationTypeColors[operation.operationType]}`}>
                              {operationTypeLabels[operation.operationType]}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {template ? template.name : 'Неизвестно'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              operation.isCompleted 
                                ? 'bg-green-100 text-green-800' 
                                : isOverdue
                                  ? 'bg-red-100 text-red-800'
                                  : isForToday
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                              {operation.isCompleted 
                                ? 'Выполнено' 
                                : isOverdue
                                  ? 'Просрочено'
                                  : isForToday
                                    ? 'На сегодня'
                                    : 'Запланировано'
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {operation.isCompleted && operation.result
                              ? operation.result === 'POSITIVE' 
                                ? 'Положительный' 
                                : 'Отрицательный'
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {!operation.isCompleted && (
                              <button
                                onClick={() => {
                                  setSelectedOperation(operation.id);
                                  setShowCompleteOperationForm(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Выполнить
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
            
            {/* Пагинация операций */}
            <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">
                  Показать по
                </span>
                <select
                  value={operationsPerPage}
                  onChange={(e) => {
                    setOperationsPerPage(Number(e.target.value));
                    setOperationPage(1);
                  }}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <div className="flex items-center justify-end space-x-1">
                <p className="text-sm text-gray-500">
                  {filteredOperations.length > 0 
                    ? `${Math.min((operationPage - 1) * operationsPerPage + 1, filteredOperations.length)} - ${Math.min(operationPage * operationsPerPage, filteredOperations.length)} из ${filteredOperations.length}` 
                    : '0 записей'}
                </p>
                <button
                  onClick={() => goToOperationPage(1)}
                  disabled={operationPage === 1 || filteredOperations.length === 0}
                  className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => goToOperationPage(operationPage - 1)}
                  disabled={operationPage === 1 || filteredOperations.length === 0}
                  className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => goToOperationPage(operationPage + 1)}
                  disabled={operationPage === totalOperationPages || filteredOperations.length === 0}
                  className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => goToOperationPage(totalOperationPages)}
                  disabled={operationPage === totalOperationPages || filteredOperations.length === 0}
                  className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно создания/редактирования шаблона */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? "Редактировать шаблон" : "Создать новый шаблон"}
              </h2>
              <button
                onClick={() => setShowTemplateForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input 
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea 
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox"
                  id="is-active"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is-active" className="ml-2 block text-sm text-gray-900">
                  Активен
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editMode ? "Обновить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Модальное окно создания/редактирования шага */}
      {showStepForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editMode ? "Редактировать шаг" : "Добавить новый шаг"}
              </h2>
              <button
                onClick={() => setShowStepForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleStepSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                <input 
                  type="text"
                  value={stepForm.name}
                  onChange={(e) => setStepForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип операции</label>
                  <select 
                    value={stepForm.operationType}
                    onChange={(e) => setStepForm(prev => ({ ...prev, operationType: e.target.value as OperationType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {Object.entries(operationTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дней после предыдущей</label>
                  <input 
                    type="number"
                    min="0"
                    value={stepForm.daysAfterPrevious}
                    onChange={(e) => setStepForm(prev => ({ ...prev, daysAfterPrevious: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Условие выполнения</label>
                <select 
                  value={stepForm.condition}
                  onChange={(e) => setStepForm(prev => ({ ...prev, condition: e.target.value as 'ALWAYS' | 'POSITIVE' | 'NEGATIVE' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(conditionLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              
              {(stepForm.operationType === 'STATUS_CHANGE') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Новый статус</label>
                  <input 
                    type="text"
                    value={stepForm.changeStatus}
                    onChange={(e) => setStepForm(prev => ({ ...prev, changeStatus: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Например: Осем, Стел, ..."
                  />
                </div>
              )}
              
              {(stepForm.operationType === 'GROUP_CHANGE') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Новая группа</label>
                  <select 
                    value={stepForm.changeGroupId}
                    onChange={(e) => setStepForm(prev => ({ ...prev, changeGroupId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.number}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea 
                  value={stepForm.description}
                  onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Порядок сортировки</label>
                <input 
                  type="number"
                  min="1"
                  value={stepForm.sortOrder}
                  onChange={(e) => setStepForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Определяет порядок выполнения шагов. Шаги с меньшим числом выполняются раньше.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStepForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editMode ? "Обновить" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Модальное окно назначения плана */}
      {showAssignPlanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Назначить план</h2>
              <button
                onClick={() => {
                  setShowAssignPlanForm(false);
                  setSelectedAnimals([]);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAssignPlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Шаблон</label>
                  <select 
                    value={assignPlanForm.templateId}
                    onChange={(e) => setAssignPlanForm(prev => ({ ...prev, templateId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Выберите шаблон</option>
                    {templates
                      .filter(t => t.isActive) // Отображаем только активные шаблоны
                      .map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
                  <input 
                    type="date"
                    value={assignPlanForm.startDate}
                    onChange={(e) => setAssignPlanForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start mb-4">
                  <Info size={24} className="text-blue-500 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-md font-medium text-blue-800">Выбор животных</h3>
                    <p className="text-sm text-blue-600 mt-1">
                      Выберите одно или несколько животных для назначения плана. 
                      {selectedAnimals.length > 0 && ` Выбрано: ${selectedAnimals.length}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Поиск по номеру..."
                      value={animalSearchTerm}
                      onChange={(e) => setAnimalSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="text-gray-500" size={18} />
                    <select
                      value={selectedGroupFilter}
                      onChange={(e) => setSelectedGroupFilter(e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Все группы</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.number}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Filter className="text-gray-500" size={18} />
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Все статусы</option>
                      {uniqueStatuses.map((status, index) => (
                        <option key={index} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllAnimalsOnPage}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllAnimalsOnPage}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Снять выбор
                    </button>
                  </div>
                </div>
                
                {/* Таблица животных с чекбоксами */}
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Выбор
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Номер
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Группа
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Статус
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedAnimals.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            Нет животных, соответствующих критериям поиска.
                          </td>
                        </tr>
                      ) : (
                        paginatedAnimals.map(animal => (
                          <tr 
                            key={animal.id}
                            className={selectedAnimals.includes(animal.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedAnimals.includes(animal.id)}
                                onChange={() => toggleAnimalSelection(animal.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {animal.number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getGroupName(animal.groupId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                {animal.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Пагинация для животных */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 mr-2">
                      Показать по
                    </span>
                    <select
                      value={animalsPerPage}
                      onChange={(e) => {
                        setAnimalsPerPage(Number(e.target.value));
                        setAnimalPage(1);
                      }}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-1">
                    <p className="text-sm text-gray-500">
                      {filteredAnimals.length > 0 
                        ? `${Math.min((animalPage - 1) * animalsPerPage + 1, filteredAnimals.length)} - ${Math.min(animalPage * animalsPerPage, filteredAnimals.length)} из ${filteredAnimals.length}` 
                        : '0 записей'}
                    </p>
                    <button
                      type="button"
                      onClick={() => goToAnimalPage(1)}
                      disabled={animalPage === 1 || filteredAnimals.length === 0}
                      className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAnimalPage(animalPage - 1)}
                      disabled={animalPage === 1 || filteredAnimals.length === 0}
                      className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAnimalPage(animalPage + 1)}
                      disabled={animalPage === totalAnimalPages || filteredAnimals.length === 0}
                      className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAnimalPage(totalAnimalPages)}
                      disabled={animalPage === totalAnimalPages || filteredAnimals.length === 0}
                      className="p-1 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignPlanForm(false);
                    setSelectedAnimals([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={!assignPlanForm.templateId || (selectedAnimals.length === 0 && !assignPlanForm.animalId)}
                >
                  {selectedAnimals.length > 0 
                    ? `Назначить план ${selectedAnimals.length} животным` 
                    : 'Назначить план'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления шаблона */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Подтвердите удаление
                </h2>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Вы действительно хотите удалить этот шаблон? Это действие нельзя отменить.
                Все шаги, связанные с данным шаблоном, также будут удалены.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно выполнения операции */}
      {showCompleteOperationForm && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Выполнение операции
              </h2>
              <button
                onClick={() => {
                  setShowCompleteOperationForm(false);
                  setSelectedOperation(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Информация об операции */}
            {(() => {
              const operation = scheduledOperations.find(op => op.id === selectedOperation);
              if (!operation) return null;
              
              const animal = animals.find(a => a.id === operation.animalId);
              const plan = assignedPlans.find(p => p.id === operation.planId);
              const template = templates.find(t => t.id === plan?.templateId);
              
              return (
                <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="font-medium text-gray-500">Дата:</div>
                    <div>{operation.scheduledDate}</div>
                    
                    <div className="font-medium text-gray-500">Животное:</div>
                    <div>{animal ? animal.number : 'Неизвестно'}</div>
                    
                    <div className="font-medium text-gray-500">Тип операции:</div>
                    <div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${operationTypeColors[operation.operationType]}`}>
                        {operationTypeLabels[operation.operationType]}
                      </span>
                    </div>
                    
                    <div className="font-medium text-gray-500">Шаблон:</div>
                    <div>{template ? template.name : 'Неизвестно'}</div>
                  </div>
                </div>
              );
            })()}
            
            <form onSubmit={handleCompleteOperation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Результат</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="result-positive"
                      name="result"
                      value="POSITIVE"
                      checked={operationResult === 'POSITIVE'}
                      onChange={() => setOperationResult('POSITIVE')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="result-positive" className="ml-2 block text-sm text-gray-700">
                      Положительный
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="result-negative"
                      name="result"
                      value="NEGATIVE"
                      checked={operationResult === 'NEGATIVE'}
                      onChange={() => setOperationResult('NEGATIVE')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <label htmlFor="result-negative" className="ml-2 block text-sm text-gray-700">
                      Отрицательный
                    </label>
                  </div>
                </div>
                
                <p className="mt-1 text-xs text-gray-500">
                  Результат операции повлияет на дальнейшее выполнение плана.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                <textarea 
                  value={operationNotes}
                  onChange={(e) => setOperationNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteOperationForm(false);
                    setSelectedOperation(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={processingOperation}
                >
                  {processingOperation ? 'Выполнение...' : 'Отметить как выполненное'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Модальное окно отчета */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Отчет по плановым операциям
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrintReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <Printer size={18} className="mr-2" />
                  Печать
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-700 mb-3">Фильтры отчета</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
                  <input
                    type="date"
                    value={reportFilters.dateFrom}
                    onChange={(e) => setReportFilters({...reportFilters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
                  <input
                    type="date"
                    value={reportFilters.dateTo}
                    onChange={(e) => setReportFilters({...reportFilters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Шаблон</label>
                  <select
                    value={reportFilters.template}
                    onChange={(e) => setReportFilters({...reportFilters, template: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Все шаблоны</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Группа</label>
                  <select
                    value={reportFilters.group}
                    onChange={(e) => setReportFilters({...reportFilters, group: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Все группы</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.number}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Статус животного</label>
                  <select
                    value={reportFilters.status}
                    onChange={(e) => setReportFilters({...reportFilters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Все статусы</option>
                    {uniqueStatuses.map((status, index) => (
                      <option key={index} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex-grow overflow-auto">
              <iframe 
                ref={printFrameRef}
                srcDoc={generateReportHTML()}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannedOperations;