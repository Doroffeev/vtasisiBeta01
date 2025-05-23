import React, { useState, useEffect } from 'react';
import { 
  usePlannedOperations, 
  OperationType, 
  operationTypeLabels, 
  operationTypeColors 
} from '../contexts/PlannedOperationsContext';
import { useMovements } from '../contexts/MovementsContext';
import { useGroups } from '../contexts/GroupsContext';
import { format, addDays } from 'date-fns';
import { AlertTriangle, Calendar, Check, ChevronRight, Plus, X } from 'lucide-react';

const DEFAULT_REPRODUCTION_CYCLE = [
  { operationType: 'INSEMINATION', name: 'Осеменение', daysAfterPrevious: 0, sortOrder: 1 },
  { operationType: 'PREGNANCY_TEST', name: 'Тест стельности (30 дней)', daysAfterPrevious: 30, sortOrder: 2 },
  { operationType: 'PREGNANCY_TEST', name: 'Повторный тест стельности', daysAfterPrevious: 60, sortOrder: 3 },
  { operationType: 'GROUP_CHANGE', name: 'Перевод на сухостой', daysAfterPrevious: 150, sortOrder: 4 },
  { operationType: 'GROUP_CHANGE', name: 'Перевод на сухостой 2', daysAfterPrevious: 30, sortOrder: 5 },
  { operationType: 'CALVING', name: 'Ожидаемый отел', daysAfterPrevious: 45, sortOrder: 6 },
  { operationType: 'INSEMINATION', name: 'Начало нового цикла', daysAfterPrevious: 60, sortOrder: 7 }
];

const TEMPLATE_NAME = "Стандартный репродуктивный цикл";
const TEMPLATE_DESCRIPTION = "Полный цикл от осеменения до отёла с последующим началом нового цикла";

interface ReproductionCycleProps {
  animalId?: string;
}

const ReproductionCycle: React.FC<ReproductionCycleProps> = ({ animalId }) => {
  const { 
    templates, 
    steps,
    assignedPlans,
    scheduledOperations,
    createTemplate, 
    createStep,
    assignPlan,
    getTemplateById,
    getTemplateSteps,
    getPlanById
  } = usePlannedOperations();
  
  const { groups } = useGroups();
  const { getAnimalById } = useMovements();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupForSecondPhase, setSelectedGroupForSecondPhase] = useState<string>('');
  
  // Найдем существующий шаблон репродуктивного цикла
  const reproductionTemplate = templates.find(t => t.name === TEMPLATE_NAME);
  
  // Найдем план для текущего животного, если animalId указан
  const animalPlans = animalId 
    ? assignedPlans.filter(p => p.animalId === animalId)
    : [];
  
  const activeAnimalPlan = animalPlans.find(p => !p.isCompleted);
  const animalDetails = animalId ? getAnimalById(animalId) : undefined;
  
  // Получаем запланированные операции для животного
  const animalScheduledOperations = animalId
    ? scheduledOperations.filter(op => op.animalId === animalId)
    : [];
  
  // Сортируем запланированные операции по дате
  const sortedAnimalOperations = [...animalScheduledOperations].sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  // Функция для создания шаблона репродуктивного цикла
  const createReproductionCycleTemplate = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedGroup || !selectedGroupForSecondPhase) {
        setError('Необходимо выбрать группы для сухостоя');
        setLoading(false);
        return;
      }
      
      // Создаем шаблон
      const template = await createTemplate({
        name: TEMPLATE_NAME,
        description: TEMPLATE_DESCRIPTION,
        isActive: true
      });
      
      if (template) {
        // Создаем шаги шаблона
        for (const stepData of DEFAULT_REPRODUCTION_CYCLE) {
          // Добавляем информацию о группах для шагов с изменением группы
          let changeGroupId: string | undefined = undefined;
          
          if (stepData.operationType === 'GROUP_CHANGE') {
            if (stepData.name.includes('сухостой 2')) {
              changeGroupId = selectedGroupForSecondPhase;
            } else {
              changeGroupId = selectedGroup;
            }
          }
          
          await createStep({
            templateId: template.id,
            operationType: stepData.operationType as OperationType,
            name: stepData.name,
            daysAfterPrevious: stepData.daysAfterPrevious,
            sortOrder: stepData.sortOrder,
            changeGroupId
          });
        }
        
        setSuccess('Шаблон репродуктивного цикла успешно создан');
        setShowCreateTemplate(false);
      }
    } catch (err) {
      console.error('Ошибка при создании шаблона:', err);
      setError('Не удалось создать шаблон репродуктивного цикла');
    } finally {
      setLoading(false);
    }
  };

  // Функция для назначения плана репродуктивного цикла животному
  const assignReproductionPlan = async () => {
    try {
      if (!animalId || !reproductionTemplate) return;
      
      setLoading(true);
      setError(null);
      
      // Проверяем, нет ли уже активного плана для этого животного
      if (activeAnimalPlan) {
        setError('У животного уже есть активный план репродукции');
        return;
      }
      
      // Назначаем план
      const plan = await assignPlan({
        templateId: reproductionTemplate.id,
        animalId,
        startDate: format(new Date(), 'yyyy-MM-dd')
      });
      
      if (plan) {
        setSuccess('План репродуктивного цикла успешно назначен');
      }
    } catch (err) {
      console.error('Ошибка при назначении плана:', err);
      setError('Не удалось назначить план репродуктивного цикла');
    } finally {
      setLoading(false);
    }
  };

  // Функция для отображения состояния операции
  const getOperationStatusClass = (operation: typeof scheduledOperations[0]) => {
    if (operation.isCompleted) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    
    const now = new Date();
    const scheduledDate = new Date(operation.scheduledDate);
    
    if (scheduledDate < now) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    if (scheduledDate <= addDays(now, 7)) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
          <div className="flex items-start">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {!reproductionTemplate && !showCreateTemplate && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Шаблон репродуктивного цикла еще не создан
              </p>
              <div className="mt-2">
                <button
                  onClick={() => setShowCreateTemplate(true)}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors"
                >
                  Создать шаблон
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTemplate && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Создание шаблона репродуктивного цикла</h3>
            <button
              onClick={() => setShowCreateTemplate(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Группа для сухостоя (первая фаза)
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Выберите группу</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.number}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Группа для сухостоя (вторая фаза)
              </label>
              <select
                value={selectedGroupForSecondPhase}
                onChange={(e) => setSelectedGroupForSecondPhase(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Выберите группу</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.number}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-md font-medium mb-2">Этапы репродуктивного цикла:</h4>
              <ol className="space-y-3 pl-2">
                {DEFAULT_REPRODUCTION_CYCLE.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mr-2">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{step.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Тип: {operationTypeLabels[step.operationType as OperationType]}, 
                        {step.daysAfterPrevious > 0 
                          ? ` через ${step.daysAfterPrevious} дней после предыдущей операции` 
                          : ' в день начала'}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex justify-end">
              <button
                onClick={createReproductionCycleTemplate}
                disabled={loading || !selectedGroup || !selectedGroupForSecondPhase}
                className={`px-4 py-2 rounded-md text-white ${
                  loading || !selectedGroup || !selectedGroupForSecondPhase 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Создание...' : 'Создать шаблон'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reproductionTemplate && animalId && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Репродуктивный цикл</h3>
            {!activeAnimalPlan && (
              <button
                onClick={assignReproductionPlan}
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Plus size={18} className="inline mr-1" />
                Назначить цикл
              </button>
            )}
          </div>

          {activeAnimalPlan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <span className="text-sm font-medium text-gray-500">Животное:</span>
                  <span className="ml-2">{animalDetails?.number}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Статус:</span>
                  <span className="ml-2">{animalDetails?.status}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Дата начала:</span>
                  <span className="ml-2">{format(new Date(activeAnimalPlan.startDate), 'dd.MM.yyyy')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium mb-2">Запланированные операции:</h4>
                {sortedAnimalOperations.length > 0 ? (
                  <div className="space-y-2">
                    {sortedAnimalOperations.map(operation => {
                      const step = steps.find(s => s.id === operation.stepId);
                      return (
                        <div 
                          key={operation.id} 
                          className={`p-3 rounded-md border ${getOperationStatusClass(operation)}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Calendar size={18} className="mr-2" />
                              <div>
                                <div className="font-medium">{step?.name}</div>
                                <div className="text-xs">
                                  {format(new Date(operation.scheduledDate), 'dd.MM.yyyy')}
                                </div>
                              </div>
                            </div>
                            <div>
                              <span className={`px-2 py-1 text-xs rounded-full ${operationTypeColors[operation.operationType]}`}>
                                {operationTypeLabels[operation.operationType]}
                              </span>
                            </div>
                            {!operation.isCompleted && (
                              <button 
                                className="ml-2 text-blue-600 hover:text-blue-800 flex items-center text-sm"
                                onClick={() => {
                                  // Здесь будет переход к выполнению операции
                                  window.location.href = operation.operationType === 'INSEMINATION' 
                                    ? '/insemination' 
                                    : operation.operationType === 'PREGNANCY_TEST'
                                    ? '/pregnancy-test'
                                    : operation.operationType === 'CALVING'
                                    ? '/calvings'
                                    : '/vet-operations';
                                }}
                              >
                                Перейти <ChevronRight size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Нет запланированных операций
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              У животного нет назначенного репродуктивного цикла
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReproductionCycle;