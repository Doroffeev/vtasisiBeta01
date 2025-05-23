import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format, isAfter, startOfDay, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { useMovements } from './MovementsContext'; // Импортируем контекст MovementsContext

export interface MedicationUsage {
  id?: string; // Добавляем опциональный ID для корректной работы с базой данных
  medicationId: string;
  quantity: number;
  totalPrice: number;
}

export interface PlannedOperation {
  date: string;
  code: string;
  description: string;
}

export interface VetOperation {
  id: string;
  date: string;
  time: string;
  code: string;
  price: string;
  executorId: string;
  result: string;
  comments: string[];
  animalId: string;
  plannedOperations: PlannedOperation[];
  medications: MedicationUsage[];
  isDeleted?: boolean;
  deletionReason?: string;
  deletionDate?: string;
  isCancelled?: boolean;
  cancellationReason?: string;
  cancellationDate?: string;
}

export interface TreatmentStep {
  id: string;
  day: number;
  procedure: string;
  medications: MedicationUsage[];
  isCompleted?: boolean;
  completionDate?: string;
  completionExecutorId?: string;
}

export interface TreatmentScheme {
  id: string;
  name: string;
  description: string;
  supervisorId: string;
  steps: TreatmentStep[];
  isActive: boolean;
}

export interface CompletedTreatment {
  id: string;
  animalId: string;
  date: string;
  completionType: 'discharge' | 'disposal';
  comment: string;
  schemeId: string;
  treatmentId: string;
  schemeName: string;
}

export interface ActiveTreatment {
  id: string;
  schemeId: string;
  animalId: string;
  startDate: string;
  currentStep: number;
  completedSteps: {
    stepId: string;
    date: string;
    result: string;
    executorId: string;
  }[];
  isCompleted: boolean;
  completionType?: 'discharge' | 'disposal';
  completionDate?: string;
  completionComment?: string;
  missedSteps?: {
    stepId: string;
    date: string;
  }[];
}

interface VetOperationsContextType {
  operations: VetOperation[];
  treatmentSchemes: TreatmentScheme[];
  activeTreatments: ActiveTreatment[];
  completedTreatments: CompletedTreatment[];
  addOperation: (operation: Omit<VetOperation, 'id'>) => Promise<VetOperation>;
  deleteOperation: (id: string, reason: string) => Promise<void>;
  cancelOperation: (id: string, reason: string) => Promise<void>;
  addTreatmentScheme: (scheme: Omit<TreatmentScheme, 'id'>) => Promise<TreatmentScheme>;
  updateTreatmentScheme: (id: string, scheme: Partial<TreatmentScheme>) => Promise<void>;
  deleteTreatmentScheme: (id: string) => Promise<void>;
  startTreatment: (schemeId: string, animalId: string) => Promise<ActiveTreatment>;
  completeStep: (treatmentId: string, stepId: string, result: string, executorId: string) => Promise<void>;
  completeTreatment: (treatmentId: string, type: 'discharge' | 'disposal', comment: string) => Promise<void>;
  getMissedTreatments: () => {
    animalId: string;
    schemeId: string;
    stepId: string;
    expectedDate: string;
    treatmentId: string;
  }[];
  isLoading: boolean;
  error: string | null;
}

const VetOperationsContext = createContext<VetOperationsContextType | undefined>(undefined);

export const VetOperationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useUser();
  const { startAnimalTreatment, endAnimalTreatment } = useMovements(); // Получаем функции для обновления статуса животного
  const [operations, setOperations] = useState<VetOperation[]>([]);
  const [treatmentSchemes, setTreatmentSchemes] = useState<TreatmentScheme[]>([]);
  const [activeTreatments, setActiveTreatments] = useState<ActiveTreatment[]>([]);
  const [completedTreatments, setCompletedTreatments] = useState<CompletedTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);

  // Функция для загрузки данных из Supabase
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!supabase) {
        console.log('Supabase не инициализирован, используем локальные данные');
        setIsLoading(false);
        return;
      }

      // Загрузка ветеринарных операций
      await loadOperations();
      
      // Загрузка схем лечения
      await loadTreatmentSchemes();
      
      // Загрузка активных лечений
      await loadActiveTreatments();
      
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Произошла ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка ветеринарных операций
  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('vet_operations')
        .select(`
          *,
          medication_usages(*),
          operation_comments(*)
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Ошибка при загрузке ветеринарных операций:', error.message);
        return;
      }

      if (data) {
        const formattedOperations: VetOperation[] = data.map(op => ({
          id: op.id,
          date: op.date,
          time: op.time,
          code: op.code,
          price: op.price?.toString() || '',
          executorId: op.executor_id || '',
          result: op.result || '',
          comments: op.operation_comments?.map(c => c.comment) || [],
          animalId: op.animal_id || '',
          plannedOperations: [], // Будет заполнено позже, если необходимо
          medications: op.medication_usages?.map(mu => ({
            id: mu.id, // Добавляем ID для каждого использования препарата
            medicationId: mu.medication_id,
            quantity: mu.quantity,
            totalPrice: mu.total_price
          })) || [],
          isDeleted: op.is_deleted,
          deletionReason: op.deletion_reason,
          deletionDate: op.deletion_date,
          isCancelled: op.is_cancelled,
          cancellationReason: op.cancellation_reason,
          cancellationDate: op.cancellation_date
        }));

        setOperations(formattedOperations);
      }
    } catch (err) {
      console.error('Ошибка при загрузке ветеринарных операций:', err);
    }
  };

  // Загрузка схем лечения
  const loadTreatmentSchemes = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_schemes')
        .select(`
          *,
          treatment_steps(*, treatment_step_medications(*))
        `)
        .order('name');

      if (error) {
        console.error('Ошибка при загрузке схем лечения:', error.message);
        return;
      }

      if (data) {
        const formattedSchemes: TreatmentScheme[] = data.map(scheme => ({
          id: scheme.id,
          name: scheme.name,
          description: scheme.description || '',
          supervisorId: scheme.supervisor_id,
          isActive: scheme.is_active,
          steps: scheme.treatment_steps?.map(step => ({
            id: step.id,
            day: step.day,
            procedure: step.procedure,
            medications: step.treatment_step_medications?.map(med => ({
              id: med.id,
              medicationId: med.medication_id,
              quantity: med.quantity,
              totalPrice: med.total_price
            })) || []
          })) || []
        }));

        setTreatmentSchemes(formattedSchemes);
      }
    } catch (err) {
      console.error('Ошибка при загрузке схем лечения:', err);
    }
  };

  // Загрузка активных лечений
  const loadActiveTreatments = async () => {
    try {
      const { data, error } = await supabase
        .from('active_treatments')
        .select(`
          *,
          completed_steps(*),
          missed_steps(*)
        `)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Ошибка при загрузке активных лечений:', error.message);
        return;
      }

      if (data) {
        const formattedTreatments: ActiveTreatment[] = data.map(treatment => ({
          id: treatment.id,
          schemeId: treatment.scheme_id,
          animalId: treatment.animal_id,
          startDate: treatment.start_date,
          currentStep: treatment.current_step,
          isCompleted: treatment.is_completed,
          completionType: treatment.completion_type,
          completionDate: treatment.completion_date,
          completionComment: treatment.completion_comment,
          completedSteps: treatment.completed_steps?.map(step => ({
            stepId: step.step_id,
            date: step.date,
            result: step.result,
            executorId: step.executor_id
          })) || [],
          missedSteps: treatment.missed_steps?.map(step => ({
            stepId: step.step_id,
            date: step.date
          })) || []
        }));

        setActiveTreatments(formattedTreatments);

        // Загрузка завершенных лечений
        loadCompletedTreatments(formattedTreatments);
      }
    } catch (err) {
      console.error('Ошибка при загрузке активных лечений:', err);
    }
  };

  // Формирование списка завершенных лечений из активных
  const loadCompletedTreatments = (activeTreatments: ActiveTreatment[]) => {
    const completed: CompletedTreatment[] = [];
    
    for (const treatment of activeTreatments) {
      if (treatment.isCompleted && treatment.completionType && treatment.completionDate) {
        const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
        
        if (scheme) {
          completed.push({
            id: crypto.randomUUID(),
            animalId: treatment.animalId,
            date: treatment.completionDate,
            completionType: treatment.completionType,
            comment: treatment.completionComment || '',
            schemeId: treatment.schemeId,
            treatmentId: treatment.id,
            schemeName: scheme.name
          });
        }
      }
    }
    
    setCompletedTreatments(completed);
  };

  const addOperation = async (operationData: Omit<VetOperation, 'id'>): Promise<VetOperation> => {
    try {
      setIsLoading(true);
      
      // Создаем локальный ID для операции
      const localId = crypto.randomUUID();
      
      // Создаем объект операции для локального состояния
      const newOperation: VetOperation = {
        ...operationData,
        id: localId
      };
      
      // Обновляем локальное состояние
      setOperations(prev => [...prev, newOperation]);
      
      // Если Supabase не инициализирован, возвращаем локальную операцию
      if (!supabase) {
        setIsLoading(false);
        return newOperation;
      }
      
      // Сохраняем операцию в Supabase
      const { data, error } = await supabase
        .from('vet_operations')
        .insert([{
          date: operationData.date,
          time: operationData.time,
          code: operationData.code,
          price: operationData.price ? parseFloat(operationData.price.toString()) : null,
          executor_id: operationData.executorId,
          result: operationData.result,
          animal_id: operationData.animalId
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении ветеринарной операции:', error.message);
        setIsLoading(false);
        return newOperation;
      }
      
      if (data && data[0]) {
        const savedOperationId = data[0].id;
        
        // Сохраняем использованные препараты
        if (operationData.medications && operationData.medications.length > 0) {
          const medicationUsages = operationData.medications.map(med => ({
            operation_id: savedOperationId,
            medication_id: med.medicationId,
            quantity: med.quantity,
            total_price: med.totalPrice
          }));
          
          await supabase
            .from('medication_usages')
            .insert(medicationUsages);
        }
        
        // Сохраняем комментарии
        if (operationData.comments && operationData.comments.length > 0) {
          const comments = operationData.comments.map(comment => ({
            operation_id: savedOperationId,
            comment
          }));
          
          await supabase
            .from('operation_comments')
            .insert(comments);
        }
        
        // Обновляем ID в локальном состоянии
        setOperations(prev => prev.map(op => 
          op.id === localId ? { ...op, id: savedOperationId } : op
        ));
        
        // Возвращаем операцию с ID из базы данных
        setIsLoading(false);
        return { ...newOperation, id: savedOperationId };
      }
      
      setIsLoading(false);
      return newOperation;
    } catch (err) {
      console.error('Ошибка при добавлении операции:', err);
      setIsLoading(false);
      // В случае ошибки возвращаем локальную операцию
      return { ...operationData, id: crypto.randomUUID() };
    }
  };

  const deleteOperation = async (id: string, reason: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Обновляем локальное состояние
      setOperations(prev => prev.map(op => 
        op.id === id 
          ? {
              ...op,
              isDeleted: true,
              deletionReason: reason,
              deletionDate: new Date().toISOString()
            }
          : op
      ));
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Обновляем запись в базе данных
      const { error } = await supabase
        .from('vet_operations')
        .update({
          is_deleted: true,
          deletion_reason: reason,
          deletion_date: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении ветеринарной операции:', error.message);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при удалении операции:', err);
      setIsLoading(false);
    }
  };

  const cancelOperation = async (id: string, reason: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Обновляем локальное состояние
      setOperations(prev => prev.map(op => 
        op.id === id 
          ? {
              ...op,
              isCancelled: true,
              cancellationReason: reason,
              cancellationDate: new Date().toISOString()
            }
          : op
      ));
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Обновляем запись в базе данных
      const { error } = await supabase
        .from('vet_operations')
        .update({
          is_cancelled: true,
          cancellation_reason: reason,
          cancellation_date: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при отмене ветеринарной операции:', error.message);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при отмене операции:', err);
      setIsLoading(false);
    }
  };

  const addTreatmentScheme = async (schemeData: Omit<TreatmentScheme, 'id'>): Promise<TreatmentScheme> => {
    try {
      setIsLoading(true);
      
      // Создаем локальный ID для схемы
      const localId = crypto.randomUUID();
      
      // Создаем объект схемы для локального состояния
      const newScheme: TreatmentScheme = {
        ...schemeData,
        id: localId
      };
      
      // Обновляем локальное состояние
      setTreatmentSchemes(prev => [...prev, newScheme]);
      
      // Если Supabase не инициализирован, возвращаем локальную схему
      if (!supabase) {
        setIsLoading(false);
        return newScheme;
      }
      
      // Сохраняем схему в Supabase
      const { data, error } = await supabase
        .from('treatment_schemes')
        .insert([{
          name: schemeData.name,
          description: schemeData.description,
          supervisor_id: schemeData.supervisorId,
          is_active: schemeData.isActive
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении схемы лечения:', error.message);
        setIsLoading(false);
        return newScheme;
      }
      
      if (data && data[0]) {
        const savedSchemeId = data[0].id;
        
        // Сохраняем этапы схемы
        if (schemeData.steps && schemeData.steps.length > 0) {
          for (const step of schemeData.steps) {
            // Сохраняем этап
            const { data: stepData, error: stepError } = await supabase
              .from('treatment_steps')
              .insert([{
                scheme_id: savedSchemeId,
                day: step.day,
                procedure: step.procedure
              }])
              .select();
            
            if (stepError) {
              console.error('Ошибка при сохранении этапа лечения:', stepError.message);
              continue;
            }
            
            if (stepData && stepData[0] && step.medications && step.medications.length > 0) {
              const savedStepId = stepData[0].id;
              
              // Сохраняем препараты для этапа
              const medicationUsages = step.medications.map(med => ({
                step_id: savedStepId,
                medication_id: med.medicationId,
                quantity: med.quantity,
                total_price: med.totalPrice
              }));
              
              await supabase
                .from('treatment_step_medications')
                .insert(medicationUsages);
            }
          }
        }
        
        // Обновляем ID в локальном состоянии
        setTreatmentSchemes(prev => prev.map(scheme => 
          scheme.id === localId ? { ...scheme, id: savedSchemeId } : scheme
        ));
        
        // Перезагружаем схемы для получения полных данных
        await loadTreatmentSchemes();
        
        // Находим сохраненную схему в обновленном состоянии
        const updatedScheme = treatmentSchemes.find(s => s.id === savedSchemeId);
        setIsLoading(false);
        return updatedScheme || { ...newScheme, id: savedSchemeId };
      }
      
      setIsLoading(false);
      return newScheme;
    } catch (err) {
      console.error('Ошибка при добавлении схемы лечения:', err);
      setIsLoading(false);
      // В случае ошибки возвращаем локальную схему
      return { ...schemeData, id: crypto.randomUUID() };
    }
  };

  const updateTreatmentScheme = async (id: string, schemeData: Partial<TreatmentScheme>): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Обновляем локальное состояние
      setTreatmentSchemes(prev => prev.map(scheme =>
        scheme.id === id ? { ...scheme, ...schemeData } : scheme
      ));
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Подготавливаем данные для обновления
      const updateData: any = {};
      if (schemeData.name !== undefined) updateData.name = schemeData.name;
      if (schemeData.description !== undefined) updateData.description = schemeData.description;
      if (schemeData.supervisorId !== undefined) updateData.supervisor_id = schemeData.supervisorId;
      if (schemeData.isActive !== undefined) updateData.is_active = schemeData.isActive;
      
      // Обновляем схему в базе данных
      const { error } = await supabase
        .from('treatment_schemes')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении схемы лечения:', error.message);
        setIsLoading(false);
        return;
      }
      
      // Обновляем этапы, если они предоставлены
      if (schemeData.steps) {
        // Сначала удаляем все существующие этапы
        await supabase
          .from('treatment_steps')
          .delete()
          .eq('scheme_id', id);
        
        // Затем добавляем новые этапы
        for (const step of schemeData.steps) {
          // Сохраняем этап
          const { data: stepData, error: stepError } = await supabase
            .from('treatment_steps')
            .insert([{
              scheme_id: id,
              day: step.day,
              procedure: step.procedure
            }])
            .select();
          
          if (stepError) {
            console.error('Ошибка при сохранении этапа лечения:', stepError.message);
            continue;
          }
          
          if (stepData && stepData[0] && step.medications && step.medications.length > 0) {
            const savedStepId = stepData[0].id;
            
            // Сохраняем препараты для этапа
            const medicationUsages = step.medications.map(med => ({
              step_id: savedStepId,
              medication_id: med.medicationId,
              quantity: med.quantity,
              total_price: med.totalPrice
            }));
            
            await supabase
              .from('treatment_step_medications')
              .insert(medicationUsages);
          }
        }
      }
      
      // Перезагружаем схемы для получения обновленных данных
      await loadTreatmentSchemes();
      setIsLoading(false);
      
    } catch (err) {
      console.error('Ошибка при обновлении схемы лечения:', err);
      setIsLoading(false);
    }
  };

  const deleteTreatmentScheme = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Обновляем локальное состояние
      setTreatmentSchemes(prev => prev.filter(scheme => scheme.id !== id));
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Удаляем схему из базы данных
      const { error } = await supabase
        .from('treatment_schemes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении схемы лечения:', error.message);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при удалении схемы лечения:', err);
      setIsLoading(false);
    }
  };

  const startTreatment = async (schemeId: string, animalId: string): Promise<ActiveTreatment> => {
    try {
      setIsLoading(true);
      
      // Создаем локальный ID для лечения
      const localId = crypto.randomUUID();
      
      // Создаем объект лечения для локального состояния
      const newTreatment: ActiveTreatment = {
        id: localId,
        schemeId,
        animalId,
        startDate: new Date().toISOString(),
        currentStep: 0,
        completedSteps: [],
        isCompleted: false,
        missedSteps: []
      };
      
      // Обновляем локальное состояние
      setActiveTreatments(prev => [...prev, newTreatment]);
      
      // Изменяем статус животного на "На лечении"
      await startAnimalTreatment(animalId);
      
      // Если Supabase не инициализирован, возвращаем локальное лечение
      if (!supabase) {
        setIsLoading(false);
        return newTreatment;
      }
      
      // Сохраняем лечение в Supabase
      const { data, error } = await supabase
        .from('active_treatments')
        .insert([{
          scheme_id: schemeId,
          animal_id: animalId,
          start_date: new Date().toISOString(),
          current_step: 0,
          is_completed: false
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при сохранении активного лечения:', error.message);
        setIsLoading(false);
        return newTreatment;
      }
      
      if (data && data[0]) {
        const savedTreatmentId = data[0].id;
        
        // Обновляем ID в локальном состоянии
        setActiveTreatments(prev => prev.map(treatment => 
          treatment.id === localId ? { ...treatment, id: savedTreatmentId } : treatment
        ));
        
        // Возвращаем лечение с ID из базы данных
        setIsLoading(false);
        return { ...newTreatment, id: savedTreatmentId };
      }
      
      setIsLoading(false);
      return newTreatment;
    } catch (err) {
      console.error('Ошибка при начале лечения:', err);
      setIsLoading(false);
      // В случае ошибки возвращаем локальное лечение
      return {
        id: crypto.randomUUID(),
        schemeId,
        animalId,
        startDate: new Date().toISOString(),
        currentStep: 0,
        completedSteps: [],
        isCompleted: false,
        missedSteps: []
      };
    }
  };

  const completeStep = async (treatmentId: string, stepId: string, result: string, executorId: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Находим лечение и схему
      const treatment = activeTreatments.find(t => t.id === treatmentId);
      if (!treatment) {
        setIsLoading(false);
        return;
      }

      const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
      if (!scheme) {
        setIsLoading(false);
        return;
      }

      const isLastStep = treatment.currentStep === scheme.steps.length - 1;
      const completionDate = new Date().toISOString();
      
      // Обновляем локальное состояние
      setActiveTreatments(prev => prev.map(t => {
        if (t.id !== treatmentId) return t;
        
        return {
          ...t,
          currentStep: isLastStep ? t.currentStep : t.currentStep + 1,
          completedSteps: [
            ...t.completedSteps,
            { stepId, date: completionDate, result, executorId }
          ],
          isCompleted: isLastStep
        };
      }));
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Проверяем существование исполнителя в базе данных
      let finalExecutorId = executorId;
      if (executorId) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', executorId);
            
          if (userError) {
            console.error('Ошибка при проверке пользователя:', userError.message);
            finalExecutorId = null;
          } else if (!userData || userData.length === 0) {
            console.warn(`Пользователь с ID ${executorId} не найден в базе данных. Используем null для executor_id.`);
            finalExecutorId = null;
          }
        } catch (checkErr) {
          console.error('Ошибка при проверке пользователя:', checkErr);
          finalExecutorId = null;
        }
      }
      
      // Сохраняем выполненный этап в базе данных
      const { error: stepError } = await supabase
        .from('completed_steps')
        .insert([{
          treatment_id: treatmentId,
          step_id: stepId,
          date: completionDate,
          result: result,
          executor_id: finalExecutorId
        }]);
      
      if (stepError) {
        console.error('Ошибка при сохранении выполненного этапа:', stepError.message);
      }
      
      // Обновляем текущий этап и статус завершения лечения
      const { error: treatmentError } = await supabase
        .from('active_treatments')
        .update({
          current_step: isLastStep ? treatment.currentStep : treatment.currentStep + 1,
          is_completed: isLastStep
        })
        .eq('id', treatmentId);
      
      if (treatmentError) {
        console.error('Ошибка при обновлении активного лечения:', treatmentError.message);
      }
      
      // Если это последний шаг, помечаем животное как выписанное
      if (isLastStep) {
        await endAnimalTreatment(treatment.animalId, finalExecutorId || '');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при выполнении этапа лечения:', err);
      setIsLoading(false);
    }
  };

  const completeTreatment = async (treatmentId: string, type: 'discharge' | 'disposal', comment: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Находим лечение и схему
      const treatment = activeTreatments.find(t => t.id === treatmentId);
      if (!treatment) {
        setIsLoading(false);
        return;
      }

      const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
      if (!scheme) {
        setIsLoading(false);
        return;
      }

      const completionDate = new Date().toISOString();

      // Обновляем локальное состояние
      setActiveTreatments(prev => prev.map(t =>
        t.id === treatmentId
          ? {
              ...t,
              isCompleted: true,
              completionType: type,
              completionDate: completionDate,
              completionComment: comment
            }
          : t
      ));

      // Добавляем в журнал завершенных лечений
      const newCompletedTreatment: CompletedTreatment = {
        id: crypto.randomUUID(),
        animalId: treatment.animalId,
        date: completionDate,
        completionType: type,
        comment: comment,
        schemeId: treatment.schemeId,
        treatmentId: treatment.id,
        schemeName: scheme.name
      };

      setCompletedTreatments(prev => [...prev, newCompletedTreatment]);
      
      // Обновляем статус животного
      if (type === 'discharge') {
        // Если выписка, возвращаем статус "Здорова"
        await endAnimalTreatment(treatment.animalId, currentUser?.id || '');
      }
      
      // Если Supabase не инициализирован, выходим
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      
      // Обновляем лечение в базе данных
      const { error } = await supabase
        .from('active_treatments')
        .update({
          is_completed: true,
          completion_type: type,
          completion_date: completionDate,
          completion_comment: comment
        })
        .eq('id', treatmentId);
      
      if (error) {
        console.error('Ошибка при завершении лечения:', error.message);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при завершении лечения:', err);
      setIsLoading(false);
    }
  };

  const getMissedTreatments = () => {
    const today = startOfDay(new Date());
    const missedTreatments: {
      animalId: string;
      schemeId: string;
      stepId: string;
      expectedDate: string;
      treatmentId: string;
    }[] = [];

    activeTreatments
      .filter(treatment => !treatment.isCompleted)
      .forEach(treatment => {
        const scheme = treatmentSchemes.find(s => s.id === treatment.schemeId);
        if (!scheme) return;

        // Проверяем каждый этап до текущего
        for (let i = 0; i <= treatment.currentStep; i++) {
          const step = scheme.steps[i];
          const stepCompleted = treatment.completedSteps.some(cs => cs.stepId === step.id);
          
          // Рассчитываем ожидаемую дату для этапа, прибавляя количество дней этапа к дате начала лечения
          const expectedDate = format(
            addDays(new Date(treatment.startDate), step.day - 1), // -1, т.к. день 1 - это день начала лечения
            'yyyy-MM-dd'
          );

          // Если этап не выполнен и дата выполнения уже прошла
          if (!stepCompleted && isAfter(today, new Date(expectedDate))) {
            missedTreatments.push({
              animalId: treatment.animalId,
              schemeId: scheme.id,
              stepId: step.id,
              expectedDate,
              treatmentId: treatment.id
            });
          }
        }
      });

    return missedTreatments;
  };

  return (
    <VetOperationsContext.Provider value={{
      operations,
      treatmentSchemes,
      activeTreatments,
      completedTreatments,
      addOperation,
      deleteOperation,
      cancelOperation,
      addTreatmentScheme,
      updateTreatmentScheme,
      deleteTreatmentScheme,
      startTreatment,
      completeStep,
      completeTreatment,
      getMissedTreatments,
      isLoading,
      error
    }}>
      {children}
    </VetOperationsContext.Provider>
  );
};

export const useVetOperations = () => {
  const context = useContext(VetOperationsContext);
  if (context === undefined) {
    throw new Error('useVetOperations must be used within a VetOperationsProvider');
  }
  return context;
};