import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { format, addDays, parseISO } from 'date-fns';
import { useMovements } from '../contexts/MovementsContext';
import { useGroups } from '../contexts/GroupsContext';
import { useUser } from '../contexts/UserContext';

// Типы для шагов операций
export type OperationType = 'INSEMINATION' | 'PREGNANCY_TEST' | 'GROUP_CHANGE' | 'STATUS_CHANGE' | 'CALVING';
export type StepCondition = 'ALWAYS' | 'POSITIVE' | 'NEGATIVE';

export interface OperationStep {
  id?: string;
  templateId: string;
  operationType: OperationType;
  name: string;
  daysAfterPrevious: number;
  changeStatus?: string; 
  changeGroupId?: string;
  description?: string;
  sortOrder: number; // Для сортировки шагов
  createdAt?: string;
  condition?: StepCondition; // Условие выполнения шага (всегда, при положительном или отрицательном результате)
}

export interface OperationTemplate {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdById?: string;
  createdAt?: string;
  updatedAt?: string;
  steps?: OperationStep[]; // Шаги шаблона
}

export interface AssignedPlan {
  id?: string;
  templateId: string;
  animalId: string;
  startDate: string;
  currentStep: number;
  isCompleted: boolean;
  completedDate?: string;
  createdAt?: string;
}

export interface ScheduledOperation {
  id?: string;
  planId: string;
  stepId: string;
  animalId: string;
  operationType: OperationType;
  scheduledDate: string;
  isCompleted: boolean;
  completedDate?: string;
  result?: 'POSITIVE' | 'NEGATIVE'; // Результат операции (для условных шагов)
  completedOperationId?: string;
  createdAt?: string;
}

// Настройки отображения типов операций
export const operationTypeLabels: Record<OperationType, string> = {
  'INSEMINATION': 'Осеменение',
  'PREGNANCY_TEST': 'Тест стельности',
  'GROUP_CHANGE': 'Смена группы',
  'STATUS_CHANGE': 'Изменение статуса',
  'CALVING': 'Отёл'
};

export const operationTypeColors: Record<OperationType, string> = {
  'INSEMINATION': 'bg-blue-100 text-blue-800',
  'PREGNANCY_TEST': 'bg-purple-100 text-purple-800',
  'GROUP_CHANGE': 'bg-green-100 text-green-800',
  'STATUS_CHANGE': 'bg-amber-100 text-amber-800',
  'CALVING': 'bg-red-100 text-red-800'
};

export const conditionLabels: Record<StepCondition, string> = {
  'ALWAYS': 'Всегда',
  'POSITIVE': 'При положительном результате',
  'NEGATIVE': 'При отрицательном результате'
};

interface PlannedOperationsContextType {
  templates: OperationTemplate[];
  steps: OperationStep[];
  assignedPlans: AssignedPlan[];
  scheduledOperations: ScheduledOperation[];
  isLoading: boolean;
  error: string | null;
  // Методы для шаблонов
  createTemplate: (template: Omit<OperationTemplate, 'id' | 'createdAt'>) => Promise<OperationTemplate | null>;
  updateTemplate: (id: string, template: Partial<OperationTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  // Методы для шагов
  createStep: (step: Omit<OperationStep, 'id' | 'createdAt'>) => Promise<OperationStep | null>;
  updateStep: (id: string, step: Partial<OperationStep>) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;
  // Методы для планов
  assignPlan: (plan: Omit<AssignedPlan, 'id' | 'currentStep' | 'isCompleted' | 'createdAt'>) => Promise<AssignedPlan | null>;
  assignPlanToMultipleAnimals: (templateId: string, animalIds: string[], startDate: string) => Promise<AssignedPlan[]>;
  completePlan: (id: string) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  // Методы для операций
  completeOperation: (id: string, result: 'POSITIVE' | 'NEGATIVE', notes?: string) => Promise<void>;
  // Вспомогательные методы
  getTemplateById: (id: string) => OperationTemplate | undefined;
  getTemplateSteps: (templateId: string) => OperationStep[];
  getPlanById: (id: string) => AssignedPlan | undefined;
  getOperationById: (id: string) => ScheduledOperation | undefined;
  getOverdueOperations: () => ScheduledOperation[];
  getTodayOperations: () => ScheduledOperation[];
  // Новые методы для репродуктивного цикла
  processOperationResult: (operationId: string, result: 'POSITIVE' | 'NEGATIVE') => Promise<void>;
  getAnimalAssignedPlans: (animalId: string) => AssignedPlan[];
  getAnimalScheduledOperations: (animalId: string) => ScheduledOperation[];
  createNextOperationInCycle: (operationId: string, result: 'POSITIVE' | 'NEGATIVE') => Promise<boolean>;
}

const PlannedOperationsContext = createContext<PlannedOperationsContextType | undefined>(undefined);

export const PlannedOperationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<OperationTemplate[]>([]);
  const [steps, setSteps] = useState<OperationStep[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<AssignedPlan[]>([]);
  const [scheduledOperations, setScheduledOperations] = useState<ScheduledOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { updateAnimalGroup, updateAnimal } = useMovements();
  const { getGroupById } = useGroups();
  const { currentUser } = useUser();
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);
  
  // Загрузка всех данных
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!supabase) {
        // Используем моковые данные, если Supabase недоступен
        setTemplates([
          {
            id: '1',
            name: 'Стандартный репродуктивный цикл',
            description: 'Полный цикл от осеменения до отёла',
            isActive: true,
            createdById: currentUser?.id
          },
          {
            id: '2',
            name: 'Экспресс-план вакцинации',
            description: 'Схема плановой вакцинации',
            isActive: true,
            createdById: currentUser?.id
          }
        ]);
        
        setSteps([
          {
            id: '101',
            templateId: '1',
            name: 'Первичное осеменение',
            operationType: 'INSEMINATION',
            daysAfterPrevious: 0,
            description: 'Проведение первичного осеменения',
            sortOrder: 1
          },
          {
            id: '102',
            templateId: '1',
            name: 'Первый тест стельности',
            operationType: 'PREGNANCY_TEST',
            daysAfterPrevious: 30,
            description: 'Первая проверка стельности через УЗИ',
            sortOrder: 2
          },
          {
            id: '103',
            templateId: '1',
            name: 'Перевод в группу сухостоя',
            operationType: 'GROUP_CHANGE',
            daysAfterPrevious: 170,
            changeGroupId: '2',
            description: 'Перевод стельной коровы в группу сухостоя',
            sortOrder: 3
          },
          {
            id: '201',
            templateId: '2',
            name: 'Первичная вакцинация',
            operationType: 'STATUS_CHANGE',
            daysAfterPrevious: 0,
            description: 'Первичная вакцинация с изменением статуса',
            sortOrder: 1
          },
          {
            id: '202',
            templateId: '2',
            name: 'Повторная вакцинация',
            operationType: 'STATUS_CHANGE',
            daysAfterPrevious: 30,
            description: 'Повторная вакцинация через 30 дней',
            sortOrder: 2
          }
        ]);
        
        setAssignedPlans([]);
        setScheduledOperations([]);
        
        setIsLoading(false);
        return;
      }
      
      // В реальном приложении здесь будут запросы к Supabase
      await Promise.all([
        loadTemplates(),
        loadSteps(),
        loadAssignedPlans(),
        loadScheduledOperations()
      ]);
      
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Загрузка шаблонов операций
  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Ошибка при загрузке шаблонов:', error.message);
        throw error;
      }
      
      if (data) {
        setTemplates(data);
      }
    } catch (err) {
      console.error('Ошибка при загрузке шаблонов:', err);
      throw err;
    }
  };
  
  // Загрузка шагов операций
  const loadSteps = async () => {
    try {
      const { data, error } = await supabase
        .from('operation_steps')
        .select('*')
        .order('template_id')
        .order('sort_order');
      
      if (error) {
        console.error('Ошибка при загрузке шагов:', error.message);
        throw error;
      }
      
      if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedSteps: OperationStep[] = data.map(step => ({
          id: step.id,
          templateId: step.template_id,
          name: step.name,
          operationType: step.operation_type as OperationType,
          daysAfterPrevious: step.days_after_previous,
          changeStatus: step.change_status,
          changeGroupId: step.change_group_id,
          description: step.description,
          sortOrder: step.sort_order,
          condition: step.condition as StepCondition,
          createdAt: step.created_at
        }));
        
        setSteps(formattedSteps);
      }
    } catch (err) {
      console.error('Ошибка при загрузке шагов:', err);
      throw err;
    }
  };
  
  // Загрузка назначенных планов
  const loadAssignedPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('assigned_plans')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Ошибка при загрузке планов:', error.message);
        throw error;
      }
      
      if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedPlans: AssignedPlan[] = data.map(plan => ({
          id: plan.id,
          templateId: plan.template_id,
          animalId: plan.animal_id,
          startDate: plan.start_date,
          currentStep: plan.current_step,
          isCompleted: plan.is_completed,
          completedDate: plan.completed_date,
          createdAt: plan.created_at
        }));
        
        setAssignedPlans(formattedPlans);
      }
    } catch (err) {
      console.error('Ошибка при загрузке планов:', err);
      throw err;
    }
  };
  
  // Загрузка запланированных операций
  const loadScheduledOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_operations')
        .select('*')
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('Ошибка при загрузке операций:', error.message);
        throw error;
      }
      
      if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedOperations: ScheduledOperation[] = data.map(op => ({
          id: op.id,
          planId: op.plan_id,
          stepId: op.step_id,
          animalId: op.animal_id,
          operationType: op.operation_type as OperationType,
          scheduledDate: op.scheduled_date,
          isCompleted: op.is_completed,
          completedDate: op.completed_date,
          result: op.result,
          completedOperationId: op.completed_operation_id,
          createdAt: op.created_at
        }));
        
        setScheduledOperations(formattedOperations);
      }
    } catch (err) {
      console.error('Ошибка при загрузке операций:', err);
      throw err;
    }
  };

  // Создание нового шаблона
  const createTemplate = async (templateData: Omit<OperationTemplate, 'id' | 'createdAt'>): Promise<OperationTemplate | null> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное создание шаблона
        const newTemplate: OperationTemplate = {
          ...templateData,
          id: crypto.randomUUID(),
          createdById: currentUser?.id,
          createdAt: new Date().toISOString()
        };
        
        setTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
      }
      
      // Сохранение в Supabase
      const { data, error } = await supabase
        .from('operation_templates')
        .insert([{
          name: templateData.name,
          description: templateData.description,
          is_active: templateData.isActive,
          created_by_id: currentUser?.id
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при создании шаблона:', error.message);
        setError(`Ошибка при создании шаблона: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const newTemplate: OperationTemplate = {
          id: data[0].id,
          name: data[0].name,
          description: data[0].description,
          isActive: data[0].is_active,
          createdById: data[0].created_by_id,
          createdAt: data[0].created_at,
          updatedAt: data[0].updated_at
        };
        
        setTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при создании шаблона:', err);
      setError('Не удалось создать шаблон');
      return null;
    }
  };
  
  // Обновление шаблона
  const updateTemplate = async (id: string, templateData: Partial<OperationTemplate>): Promise<void> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное обновление шаблона
        setTemplates(prev => prev.map(template => 
          template.id === id ? { ...template, ...templateData } : template
        ));
        return;
      }
      
      // Обновление в Supabase
      const { error } = await supabase
        .from('operation_templates')
        .update({
          name: templateData.name,
          description: templateData.description,
          is_active: templateData.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении шаблона:', error.message);
        setError(`Ошибка при обновлении шаблона: ${error.message}`);
        return;
      }
      
      setTemplates(prev => prev.map(template => 
        template.id === id ? { ...template, ...templateData } : template
      ));
    } catch (err) {
      console.error('Ошибка при обновлении шаблона:', err);
      setError('Не удалось обновить шаблон');
    }
  };
  
  // Удаление шаблона
  const deleteTemplate = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное удаление шаблона
        setTemplates(prev => prev.filter(template => template.id !== id));
        setSteps(prev => prev.filter(step => step.templateId !== id));
        return;
      }
      
      // Удаление в Supabase (каскадное удаление шагов настроено в БД)
      const { error } = await supabase
        .from('operation_templates')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении шаблона:', error.message);
        setError(`Ошибка при удалении шаблона: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setTemplates(prev => prev.filter(template => template.id !== id));
      setSteps(prev => prev.filter(step => step.templateId !== id));
    } catch (err) {
      console.error('Ошибка при удалении шаблона:', err);
      setError('Не удалось удалить шаблон');
    }
  };
  
  // Создание нового шага
  const createStep = async (stepData: Omit<OperationStep, 'id' | 'createdAt'>): Promise<OperationStep | null> => {
    try {
      setError(null);
      
      // Проверка валидности templateId
      if (!stepData.templateId || stepData.templateId.trim() === '') {
        setError('Некорректный ID шаблона');
        return null;
      }
      
      // Преобразуем пустые строки в null для UUID полей
      const changeGroupId = stepData.changeGroupId && stepData.changeGroupId.trim() !== '' ? 
        stepData.changeGroupId : null;
      
      if (!supabase) {
        // Локальное создание шага
        const newStep: OperationStep = {
          ...stepData,
          changeGroupId: changeGroupId,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        };
        
        setSteps(prev => [...prev, newStep]);
        return newStep;
      }
      
      // Сохранение в Supabase
      const { data, error } = await supabase
        .from('operation_steps')
        .insert([{
          template_id: stepData.templateId,
          operation_type: stepData.operationType,
          name: stepData.name,
          days_after_previous: stepData.daysAfterPrevious,
          change_status: stepData.changeStatus || null,
          change_group_id: changeGroupId,
          description: stepData.description || null,
          sort_order: stepData.sortOrder,
          condition: stepData.condition || 'ALWAYS'
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при создании шага:', error.message);
        setError(`Ошибка при создании шага: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const newStep: OperationStep = {
          id: data[0].id,
          templateId: data[0].template_id,
          operationType: data[0].operation_type as OperationType,
          name: data[0].name,
          daysAfterPrevious: data[0].days_after_previous,
          changeStatus: data[0].change_status,
          changeGroupId: data[0].change_group_id,
          description: data[0].description,
          sortOrder: data[0].sort_order,
          condition: data[0].condition as StepCondition,
          createdAt: data[0].created_at
        };
        
        setSteps(prev => [...prev, newStep]);
        return newStep;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при создании шага:', err);
      setError('Не удалось создать шаг');
      return null;
    }
  };
  
  // Обновление шага
  const updateStep = async (id: string, stepData: Partial<OperationStep>): Promise<void> => {
    try {
      setError(null);
      
      // Преобразуем пустые строки в null для UUID полей
      const changeGroupId = stepData.changeGroupId && stepData.changeGroupId.trim() !== '' ? 
        stepData.changeGroupId : null;
      
      if (!supabase) {
        // Локальное обновление шага
        setSteps(prev => prev.map(step => 
          step.id === id ? { 
            ...step, 
            ...stepData, 
            changeGroupId: changeGroupId 
          } : step
        ));
        return;
      }
      
      // Обновление в Supabase
      const { error } = await supabase
        .from('operation_steps')
        .update({
          operation_type: stepData.operationType,
          name: stepData.name,
          days_after_previous: stepData.daysAfterPrevious,
          change_status: stepData.changeStatus || null,
          change_group_id: changeGroupId,
          description: stepData.description || null,
          sort_order: stepData.sortOrder,
          condition: stepData.condition
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении шага:', error.message);
        setError(`Ошибка при обновлении шага: ${error.message}`);
        return;
      }
      
      setSteps(prev => prev.map(step => 
        step.id === id ? { 
          ...step, 
          ...stepData,
          changeGroupId: changeGroupId
        } : step
      ));
    } catch (err) {
      console.error('Ошибка при обновлении шага:', err);
      setError('Не удалось обновить шаг');
    }
  };
  
  // Удаление шага
  const deleteStep = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное удаление шага
        setSteps(prev => prev.filter(step => step.id !== id));
        return;
      }
      
      // Удаление в Supabase
      const { error } = await supabase
        .from('operation_steps')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении шага:', error.message);
        setError(`Ошибка при удалении шага: ${error.message}`);
        return;
      }
      
      setSteps(prev => prev.filter(step => step.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении шага:', err);
      setError('Не удалось удалить шаг');
    }
  };
  
  // Назначение плана для животного
  const assignPlan = async (planData: Omit<AssignedPlan, 'id' | 'currentStep' | 'isCompleted' | 'createdAt'>): Promise<AssignedPlan | null> => {
    try {
      setError(null);
      
      if (!planData.templateId || !planData.animalId || !planData.startDate) {
        setError('Необходимо указать шаблон, животное и дату начала');
        return null;
      }
      
      // Проверяем наличие шагов в шаблоне
      const templateSteps = getTemplateSteps(planData.templateId);
      if (templateSteps.length === 0) {
        setError('Шаблон не содержит шагов');
        return null;
      }
      
      if (!supabase) {
        // Локальное создание плана
        const newPlan: AssignedPlan = {
          ...planData,
          id: crypto.randomUUID(),
          currentStep: 0,
          isCompleted: false,
          createdAt: new Date().toISOString()
        };
        
        setAssignedPlans(prev => [...prev, newPlan]);
        
        // Создаем первую запланированную операцию
        const firstStep = templateSteps[0];
        if (firstStep) {
          const newOperation: ScheduledOperation = {
            id: crypto.randomUUID(),
            planId: newPlan.id,
            stepId: firstStep.id!,
            animalId: planData.animalId,
            operationType: firstStep.operationType,
            scheduledDate: planData.startDate,
            isCompleted: false,
            createdAt: new Date().toISOString()
          };
          
          setScheduledOperations(prev => [...prev, newOperation]);
        }
        
        return newPlan;
      }
      
      // Сохранение в Supabase
      const { data, error } = await supabase
        .from('assigned_plans')
        .insert([{
          template_id: planData.templateId,
          animal_id: planData.animalId,
          start_date: planData.startDate,
          current_step: 0,
          is_completed: false
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при назначении плана:', error.message);
        setError(`Ошибка при назначении плана: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const newPlan: AssignedPlan = {
          id: data[0].id,
          templateId: data[0].template_id,
          animalId: data[0].animal_id,
          startDate: data[0].start_date,
          currentStep: data[0].current_step,
          isCompleted: data[0].is_completed,
          completedDate: data[0].completed_date,
          createdAt: data[0].created_at
        };
        
        // Добавляем план в локальное состояние
        setAssignedPlans(prev => [...prev, newPlan]);
        
        // Создаем первую запланированную операцию
        const firstStep = templateSteps[0];
        if (firstStep && firstStep.id) {
          await supabase
            .from('scheduled_operations')
            .insert([{
              plan_id: newPlan.id,
              step_id: firstStep.id,
              animal_id: planData.animalId,
              operation_type: firstStep.operationType,
              scheduled_date: planData.startDate,
              is_completed: false
            }])
            .select();
          
          // Обновляем список запланированных операций
          await loadScheduledOperations();
        }
        
        return newPlan;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при назначении плана:', err);
      setError('Не удалось назначить план');
      return null;
    }
  };

  // Назначение плана для нескольких животных
  const assignPlanToMultipleAnimals = async (templateId: string, animalIds: string[], startDate: string): Promise<AssignedPlan[]> => {
    try {
      setError(null);
      
      if (!templateId || animalIds.length === 0 || !startDate) {
        setError('Необходимо указать шаблон, хотя бы одно животное и дату начала');
        return [];
      }
      
      // Проверяем наличие шагов в шаблоне
      const templateSteps = getTemplateSteps(templateId);
      if (templateSteps.length === 0) {
        setError('Шаблон не содержит шагов');
        return [];
      }
      
      const createdPlans: AssignedPlan[] = [];
      
      if (!supabase) {
        // Локальное создание планов
        for (const animalId of animalIds) {
          const newPlan: AssignedPlan = {
            templateId,
            animalId,
            startDate,
            id: crypto.randomUUID(),
            currentStep: 0,
            isCompleted: false,
            createdAt: new Date().toISOString()
          };
          
          // Создаем первую запланированную операцию
          const firstStep = templateSteps[0];
          if (firstStep) {
            const newOperation: ScheduledOperation = {
              id: crypto.randomUUID(),
              planId: newPlan.id,
              stepId: firstStep.id!,
              animalId: animalId,
              operationType: firstStep.operationType,
              scheduledDate: startDate,
              isCompleted: false,
              createdAt: new Date().toISOString()
            };
            
            setScheduledOperations(prev => [...prev, newOperation]);
          }
          
          createdPlans.push(newPlan);
        }
        
        setAssignedPlans(prev => [...prev, ...createdPlans]);
        return createdPlans;
      }
      
      // Сохранение в Supabase
      for (const animalId of animalIds) {
        const { data, error } = await supabase
          .from('assigned_plans')
          .insert([{
            template_id: templateId,
            animal_id: animalId,
            start_date: startDate,
            current_step: 0,
            is_completed: false
          }])
          .select();
        
        if (error) {
          console.error(`Ошибка при назначении плана для животного ${animalId}:`, error.message);
          continue;
        }
        
        if (data && data[0]) {
          const newPlan: AssignedPlan = {
            id: data[0].id,
            templateId: data[0].template_id,
            animalId: data[0].animal_id,
            startDate: data[0].start_date,
            currentStep: data[0].current_step,
            isCompleted: data[0].is_completed,
            completedDate: data[0].completed_date,
            createdAt: data[0].created_at
          };
          
          // Добавляем план в локальное состояние
          setAssignedPlans(prev => [...prev, newPlan]);
          
          // Создаем первую запланированную операцию
          const firstStep = templateSteps[0];
          if (firstStep && firstStep.id) {
            await supabase
              .from('scheduled_operations')
              .insert([{
                plan_id: newPlan.id,
                step_id: firstStep.id,
                animal_id: animalId,
                operation_type: firstStep.operationType,
                scheduled_date: startDate,
                is_completed: false
              }]);
          }
          
          createdPlans.push(newPlan);
        }
      }
      
      // Обновляем список запланированных операций
      await loadScheduledOperations();
      
      return createdPlans;
    } catch (err) {
      console.error('Ошибка при назначении планов нескольким животным:', err);
      setError('Не удалось назначить планы нескольким животным');
      return [];
    }
  };
  
  // Завершение плана
  const completePlan = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное обновление плана
        setAssignedPlans(prev => prev.map(plan => 
          plan.id === id 
            ? { 
                ...plan, 
                isCompleted: true, 
                completedDate: new Date().toISOString() 
              } 
            : plan
        ));
        return;
      }
      
      // Обновление в Supabase
      const { error } = await supabase
        .from('assigned_plans')
        .update({
          is_completed: true,
          completed_date: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при завершении плана:', error.message);
        setError(`Ошибка при завершении плана: ${error.message}`);
        return;
      }
      
      setAssignedPlans(prev => prev.map(plan => 
        plan.id === id 
          ? { 
              ...plan, 
              isCompleted: true, 
              completedDate: new Date().toISOString() 
            } 
          : plan
      ));
    } catch (err) {
      console.error('Ошибка при завершении плана:', err);
      setError('Не удалось завершить план');
    }
  };
  
  // Удаление плана
  const deletePlan = async (id: string): Promise<void> => {
    try {
      setError(null);
      
      if (!supabase) {
        // Локальное удаление плана и связанных операций
        setAssignedPlans(prev => prev.filter(plan => plan.id !== id));
        setScheduledOperations(prev => prev.filter(op => op.planId !== id));
        return;
      }
      
      // Удаление в Supabase (каскадное удаление в БД)
      const { error } = await supabase
        .from('assigned_plans')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении плана:', error.message);
        setError(`Ошибка при удалении плана: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setAssignedPlans(prev => prev.filter(plan => plan.id !== id));
      setScheduledOperations(prev => prev.filter(op => op.planId !== id));
    } catch (err) {
      console.error('Ошибка при удалении плана:', err);
      setError('Не удалось удалить план');
    }
  };
  
  // Выполнение запланированной операции
  const completeOperation = async (id: string, result: 'POSITIVE' | 'NEGATIVE', notes?: string): Promise<void> => {
    try {
      setError(null);
      
      // Находим операцию
      const operation = scheduledOperations.find(op => op.id === id);
      if (!operation) {
        setError('Операция не найдена');
        return;
      }
      
      // Находим план и шаблон
      const plan = assignedPlans.find(p => p.id === operation.planId);
      if (!plan) {
        setError('План не найден');
        return;
      }
      
      // Находим шаг
      const step = steps.find(s => s.id === operation.stepId);
      if (!step) {
        setError('Шаг не найден');
        return;
      }
      
      // Проверяем, если операция изменяет статус или группу
      if (step.changeStatus) {
        await updateAnimal(operation.animalId, { status: step.changeStatus });
      }
      
      if (step.changeGroupId) {
        await updateAnimalGroup(operation.animalId, step.changeGroupId);
      }
      
      if (!supabase) {
        // Локальное обновление операции
        setScheduledOperations(prev => prev.map(op => 
          op.id === id 
            ? { 
                ...op, 
                isCompleted: true, 
                completedDate: new Date().toISOString(),
                result 
              } 
            : op
        ));
        
        // Создаем следующую операцию в цикле
        await createNextOperationInCycle(id, result);
        
        return;
      }
      
      // Обновление в Supabase
      const { error: opError } = await supabase
        .from('scheduled_operations')
        .update({
          is_completed: true,
          completed_date: new Date().toISOString(),
          result: result
        })
        .eq('id', id);
      
      if (opError) {
        console.error('Ошибка при выполнении операции:', opError.message);
        setError(`Ошибка при выполнении операции: ${opError.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setScheduledOperations(prev => prev.map(op => 
        op.id === id 
          ? { 
              ...op, 
              isCompleted: true, 
              completedDate: new Date().toISOString(),
              result 
            } 
          : op
      ));
      
      // Создаем следующую операцию в цикле
      await createNextOperationInCycle(id, result);
      
    } catch (err) {
      console.error('Ошибка при выполнении операции:', err);
      setError('Не удалось выполнить операцию');
    }
  };

  // Обработка результата операции и создание следующей в цикле
  const processOperationResult = async (operationId: string, result: 'POSITIVE' | 'NEGATIVE'): Promise<void> => {
    try {
      setError(null);
      
      // Находим операцию
      const operation = scheduledOperations.find(op => op.id === operationId);
      if (!operation) {
        setError('Операция не найдена');
        return;
      }
      
      // Выполняем операцию
      await completeOperation(operationId, result);
    } catch (err) {
      console.error('Ошибка при обработке результата операции:', err);
      setError('Не удалось обработать результат операции');
    }
  };

  // Создание следующей операции в цикле на основе результата текущей
  const createNextOperationInCycle = async (operationId: string, result: 'POSITIVE' | 'NEGATIVE'): Promise<boolean> => {
    // Находим операцию
    const operation = scheduledOperations.find(op => op.id === operationId);
    if (!operation) {
      setError('Операция не найдена');
      return false;
    }
    
    // Находим план
    const plan = assignedPlans.find(p => p.id === operation.planId);
    if (!plan) {
      setError('План не найден');
      return false;
    }
    
    // Получаем все шаги шаблона
    const templateSteps = getTemplateSteps(plan.templateId);
    // Находим текущий шаг по ID
    const currentStepIndex = templateSteps.findIndex(s => s.id === operation.stepId);
    
    // Если это последний шаг или текущий шаг не найден
    if (currentStepIndex === -1 || currentStepIndex === templateSteps.length - 1) {
      // Завершаем план
      await completePlan(plan.id!);
      return true;
    }
    
    // Получаем текущий и следующий шаги
    const currentStep = templateSteps[currentStepIndex];
    
    // Проверяем условия для следующих шагов
    for (let i = currentStepIndex + 1; i < templateSteps.length; i++) {
      const nextStep = templateSteps[i];
      
      // Проверяем условие выполнения следующего шага
      const condition = nextStep.condition || 'ALWAYS';
      
      // Если условие не выполняется, пропускаем этот шаг
      if (condition === 'POSITIVE' && result === 'NEGATIVE') {
        continue;
      }
      
      if (condition === 'NEGATIVE' && result === 'POSITIVE') {
        continue;
      }
      
      // Если условие выполняется, создаем операцию для этого шага
      const scheduledDate = format(
        addDays(new Date(), nextStep.daysAfterPrevious), 
        'yyyy-MM-dd'
      );
      
      // В локальном режиме
      if (!supabase) {
        const newOperation: ScheduledOperation = {
          id: crypto.randomUUID(),
          planId: plan.id!,
          stepId: nextStep.id!,
          animalId: operation.animalId,
          operationType: nextStep.operationType,
          scheduledDate,
          isCompleted: false,
          createdAt: new Date().toISOString()
        };
        
        setScheduledOperations(prev => [...prev, newOperation]);
        
        // Обновляем текущий шаг в плане
        setAssignedPlans(prev => prev.map(p => 
          p.id === plan.id ? { ...p, currentStep: i } : p
        ));
        
        return true;
      }
      
      // Через Supabase
      const { data, error } = await supabase
        .from('scheduled_operations')
        .insert([{
          plan_id: plan.id,
          step_id: nextStep.id,
          animal_id: operation.animalId,
          operation_type: nextStep.operationType,
          scheduled_date: scheduledDate,
          is_completed: false
        }])
        .select();
        
      if (error) {
        console.error('Ошибка при создании следующей операции:', error.message);
        return false;
      }
      
      // Обновляем текущий шаг в плане в Supabase
      await supabase
        .from('assigned_plans')
        .update({ current_step: i })
        .eq('id', plan.id);
      
      // Обновляем локальное состояние
      if (data && data[0]) {
        const newOp: ScheduledOperation = {
          id: data[0].id,
          planId: data[0].plan_id,
          stepId: data[0].step_id,
          animalId: data[0].animal_id,
          operationType: data[0].operation_type as OperationType,
          scheduledDate: data[0].scheduled_date,
          isCompleted: data[0].is_completed,
          completedDate: data[0].completed_date,
          result: data[0].result,
          completedOperationId: data[0].completed_operation_id,
          createdAt: data[0].created_at
        };
        
        setScheduledOperations(prev => [...prev, newOp]);
        
        // Обновляем план в локальном состоянии
        setAssignedPlans(prev => prev.map(p => 
          p.id === plan.id ? { ...p, currentStep: i } : p
        ));
      }
      
      // Обновляем список запланированных операций
      await loadScheduledOperations();
      
      return true;
    }
    
    // Если нет подходящих следующих шагов, завершаем план
    await completePlan(plan.id!);
    return true;
  };

  // Получение назначенных планов для животного
  const getAnimalAssignedPlans = (animalId: string): AssignedPlan[] => {
    return assignedPlans.filter(plan => plan.animalId === animalId);
  };

  // Получение запланированных операций для животного
  const getAnimalScheduledOperations = (animalId: string): ScheduledOperation[] => {
    return scheduledOperations
      .filter(op => op.animalId === animalId)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  };
  
  // Вспомогательные методы
  const getTemplateById = (id: string): OperationTemplate | undefined => {
    const template = templates.find(t => t.id === id);
    if (!template) return undefined;
    
    // Добавляем шаги к шаблону
    const templateSteps = steps.filter(s => s.templateId === id);
    return {
      ...template,
      steps: templateSteps
    };
  };
  
  const getTemplateSteps = (templateId: string): OperationStep[] => {
    return steps
      .filter(step => step.templateId === templateId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  };
  
  const getPlanById = (id: string): AssignedPlan | undefined => {
    return assignedPlans.find(p => p.id === id);
  };
  
  const getOperationById = (id: string): ScheduledOperation | undefined => {
    return scheduledOperations.find(op => op.id === id);
  };
  
  const getOverdueOperations = (): ScheduledOperation[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return scheduledOperations
      .filter(op => !op.isCompleted && parseISO(op.scheduledDate) < today)
      .sort((a, b) => parseISO(a.scheduledDate).getTime() - parseISO(b.scheduledDate).getTime());
  };
  
  const getTodayOperations = (): ScheduledOperation[] => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    return scheduledOperations
      .filter(op => !op.isCompleted && op.scheduledDate === today);
  };
  
  const value = {
    templates,
    steps,
    assignedPlans,
    scheduledOperations,
    isLoading,
    error,
    // Методы для шаблонов
    createTemplate,
    updateTemplate,
    deleteTemplate,
    // Методы для шагов
    createStep,
    updateStep,
    deleteStep,
    // Методы для планов
    assignPlan,
    assignPlanToMultipleAnimals,
    completePlan,
    deletePlan,
    // Методы для операций
    completeOperation,
    // Вспомогательные методы
    getTemplateById,
    getTemplateSteps,
    getPlanById,
    getOperationById,
    getOverdueOperations,
    getTodayOperations,
    // Новые методы для репродуктивного цикла
    processOperationResult,
    getAnimalAssignedPlans,
    getAnimalScheduledOperations,
    createNextOperationInCycle
  };
  
  return (
    <PlannedOperationsContext.Provider value={value}>
      {children}
    </PlannedOperationsContext.Provider>
  );
};

export const usePlannedOperations = () => {
  const context = useContext(PlannedOperationsContext);
  if (context === undefined) {
    throw new Error('usePlannedOperations must be used within a PlannedOperationsProvider');
  }
  return context;
};

export default PlannedOperationsContext;