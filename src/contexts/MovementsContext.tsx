import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase, safeSupabaseQuery } from '../lib/supabase';
import { useGroups } from './GroupsContext';

export interface Animal {
  id: string;
  name: string;
  number: string;
  groupId: string;
  status: string;
  birthDate: string;
  gender: 'male' | 'female';
  motherId?: string;
  lastCalvingDate?: string;
  lastInseminationDate?: string;
  inseminationCount: number;
  isUnderTreatment: boolean;
  hasMastitis: boolean;
  mastitisStartDate?: string;
  treatmentEndDate?: string;
  treatmentEndExecutorId?: string;
  nextCalvingDate: string;
  lactation: number;
  responder: string;
  daysInMilk?: number;
  weight?: number;
}

export interface Movement {
  id: string;
  date: string;
  animals: {
    id: string;
    number: string;
  }[];
  fromGroup: string;
  toGroup: string;
  reason: string;
}

interface MovementsContextType {
  movements: Movement[];
  animals: Animal[];
  addMovement: (movement: Omit<Movement, 'id'>) => void;
  getMovementById: (id: string) => Movement | undefined;
  getAnimalById: (id: string) => Animal | undefined;
  updateAnimalGroup: (animalId: string, newGroupId: string) => Promise<void>;
  addAnimal: (animal: Omit<Animal, 'id'>) => Promise<Animal>;
  updateAnimalStatus: (animalId: string, status: string) => void;
  updateAnimalInsemination: (animalId: string, date: string) => void;
  updateAnimalCalving: (animalId: string, date: string, hasMastitis?: boolean) => void;
  updateAnimal: (animalId: string, updatedData: Partial<Animal>) => void;
  startAnimalTreatment: (animalId: string) => void;
  endAnimalTreatment: (animalId: string, executorId: string) => void;
  setAnimalMastitis: (animalId: string, hasMastitis: boolean) => void;
}

// Функция для проверки и преобразования ID в UUID
const ensureValidUuid = (id: string): string => {
  // Регулярное выражение для проверки формата UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(id)) {
    return id;
  }
  
  // Если ID не является UUID, генерируем новый UUID
  return crypto.randomUUID();
};

const createEmptyAnimal = (partial: Partial<Animal>): Animal => ({
  id: ensureValidUuid(String(Date.now())), // Используем UUID для новых животных
  name: partial.number || '', // Используем номер в качестве имени по умолчанию
  number: '',
  groupId: '',
  status: 'Без',
  birthDate: '',
  gender: 'female',
  isUnderTreatment: false,
  hasMastitis: false,
  nextCalvingDate: '',
  lactation: 0,
  responder: '',
  daysInMilk: 0,
  weight: undefined,
  inseminationCount: 0,
  ...partial,
  id: ensureValidUuid(partial.id || String(Date.now())) // Гарантируем UUID для id
});

// Создаем контекст
const MovementsContext = createContext<MovementsContextType | undefined>(undefined);

export const MovementsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([
    createEmptyAnimal({ 
      id: crypto.randomUUID(),
      name: '0122',
      number: '0122', 
      groupId: '1', 
      status: 'Без',
      gender: 'female',
      inseminationCount: 0,
      lactation: 1
    }),
    createEmptyAnimal({ 
      id: crypto.randomUUID(),
      name: '0123',
      number: '0123', 
      groupId: '1', 
      status: 'Без',
      gender: 'female',
      inseminationCount: 0,
      lactation: 1
    })
  ]);

  React.useEffect(() => {
    loadMovements();
    loadAnimals();
  }, []);

  const loadMovements = async () => {
    try {
      if (!supabase) {
        console.log('Supabase не инициализирован, используем локальные данные');
        return;
      }

      // Используем safeSupabaseQuery для надежной загрузки данных
      const movementsData = await safeSupabaseQuery(
        () => supabase
          .from('movements')
          .select('*')
          .order('date', { ascending: false }),
        [] // Пустой массив в качестве fallback
      );

      if (!movementsData || !Array.isArray(movementsData)) {
        console.warn('Не удалось загрузить перемещения или данные не в формате массива');
        return;
      }

      const formattedMovements: Movement[] = [];

      for (const movement of movementsData) {
        try {
          // Используем safeSupabaseQuery для загрузки связанных животных
          const animalsData = await safeSupabaseQuery(
            () => supabase
              .from('movement_animals')
              .select('*')
              .eq('movement_id', movement.id),
            [] // Пустой массив в качестве fallback
          );

          if (!animalsData || !Array.isArray(animalsData)) {
            console.warn(`Не удалось загрузить животных для перемещения ${movement.id}`);
            continue;
          }

          // Получаем полную информацию о животных
          const movementAnimals = [];
          for (const animalLink of animalsData) {
            // Сначала ищем животное в локальном состоянии
            let animal = animals.find(a => a.id === animalLink.animal_id);
            
            // Если не нашли в локальном состоянии, пробуем загрузить из базы
            if (!animal && supabase) {
              const animalData = await safeSupabaseQuery(
                () => supabase
                  .from('animals')
                  .select('*')
                  .eq('id', animalLink.animal_id)
                  .maybeSingle()
              );
                
              if (animalData) {
                animal = {
                  id: animalData.id,
                  name: animalData.name || animalData.number,
                  number: animalData.number,
                  groupId: animalData.group_id || '',
                  status: animalData.status,
                  birthDate: animalData.birth_date || '',
                  gender: animalData.gender as 'male' | 'female',
                  motherId: animalData.mother_id,
                  lastCalvingDate: animalData.last_calving_date,
                  lastInseminationDate: animalData.last_insemination_date,
                  inseminationCount: animalData.insemination_count || 0,
                  isUnderTreatment: animalData.is_under_treatment || false,
                  hasMastitis: animalData.has_mastitis || false,
                  mastitisStartDate: animalData.mastitis_start_date,
                  treatmentEndDate: animalData.treatment_end_date,
                  treatmentEndExecutorId: animalData.treatment_end_executor_id,
                  nextCalvingDate: animalData.next_calving_date || '',
                  lactation: animalData.lactation || 0,
                  responder: animalData.responder || '',
                  daysInMilk: animalData.days_in_milk,
                  weight: animalData.weight
                };
              }
            }
            
            movementAnimals.push({
              id: animalLink.animal_id,
              number: animal?.number || `Животное #${animalLink.animal_id.substring(0, 8)}`
            });
          }

          formattedMovements.push({
            id: movement.id,
            date: movement.date,
            animals: movementAnimals,
            fromGroup: movement.from_group,
            toGroup: movement.to_group,
            reason: movement.reason || ''
          });
        } catch (error) {
          console.error(`Ошибка при обработке перемещения ${movement.id}:`, error);
        }
      }

      setMovements(formattedMovements);
      console.log('Успешно загружены перемещения:', formattedMovements.length);
    } catch (error) {
      console.error('Ошибка при загрузке данных о перемещениях:', error);
      // В случае критической ошибки, оставляем текущие данные без изменений
    }
  };

  const loadAnimals = async () => {
    try {
      if (!supabase) {
        console.log('Supabase не инициализирован, используем локальные данные животных');
        return;
      }

      // Используем safeSupabaseQuery для надежной загрузки данных
      const data = await safeSupabaseQuery(
        () => supabase
          .from('animals')
          .select('*')
          .order('number'),
        null // null в качестве fallback
      );

      if (data && Array.isArray(data) && data.length > 0) {
        const formattedAnimals = data.map(animal => ({
          id: animal.id,
          name: animal.name || animal.number,
          number: animal.number,
          groupId: animal.group_id || '',
          status: animal.status,
          birthDate: animal.birth_date || '',
          gender: animal.gender as 'male' | 'female',
          motherId: animal.mother_id,
          lastCalvingDate: animal.last_calving_date,
          lastInseminationDate: animal.last_insemination_date,
          inseminationCount: animal.insemination_count || 0,
          isUnderTreatment: animal.is_under_treatment || false,
          hasMastitis: animal.has_mastitis || false,
          mastitisStartDate: animal.mastitis_start_date,
          treatmentEndDate: animal.treatment_end_date,
          treatmentEndExecutorId: animal.treatment_end_executor_id,
          nextCalvingDate: animal.next_calving_date || '',
          lactation: animal.lactation || 0,
          responder: animal.responder || '',
          daysInMilk: animal.days_in_milk,
          weight: animal.weight
        }));

        setAnimals(formattedAnimals);
        console.log('Загружено животных из базы:', formattedAnimals.length);
      } else {
        console.log('В базе нет животных или ошибка загрузки, используем локальные данные');
      }
    } catch (error) {
      console.error('Ошибка при загрузке животных из базы:', error);
    }
  };

  const addMovement = async (newMovement: Omit<Movement, 'id'>) => {
    try {
      const localId = crypto.randomUUID();
      const movement = { ...newMovement, id: localId };
      
      setAnimals(prev => prev.map(animal => {
        if (newMovement.animals.some(movedAnimal => movedAnimal.id === animal.id)) {
          return { ...animal, groupId: newMovement.toGroup };
        }
        return animal;
      }));

      // Добавляем локально немедленно
      setMovements(prev => [...prev, movement]);

      if (!supabase) {
        console.log('Supabase не инициализирован, используем только локальные данные');
        return movement;
      }

      // Используем safeSupabaseQuery для надежного сохранения
      const insertedData = await safeSupabaseQuery(
        () => supabase
          .from('movements')
          .insert([{
            date: newMovement.date,
            from_group: newMovement.fromGroup,
            to_group: newMovement.toGroup,
            reason: newMovement.reason
          }])
          .select(),
        null
      );

      if (!insertedData || !Array.isArray(insertedData) || insertedData.length === 0) {
        console.error('Не удалось сохранить перемещение в базу данных');
        return movement;
      }

      const movementId = insertedData[0].id;

      // Сохраняем связи с животными
      const saveAnimalPromises = newMovement.animals.map(animal => {
        const validAnimalId = ensureValidUuid(animal.id);
        return safeSupabaseQuery(
          () => supabase
            .from('movement_animals')
            .insert([{
              movement_id: movementId,
              animal_id: validAnimalId
            }]),
          null
        );
      });

      await Promise.allSettled(saveAnimalPromises);

      // Обновляем ID в локальном состоянии
      setMovements(prev => prev.map(m => 
        m.id === localId ? { ...m, id: movementId } : m
      ));

      return { ...movement, id: movementId };
    } catch (error) {
      console.error('Ошибка при добавлении перемещения:', error);
      return { ...newMovement, id: crypto.randomUUID() };
    }
  };

  const getMovementById = (id: string) => {
    return movements.find(movement => movement.id === id);
  };

  const getAnimalById = (id: string) => {
    return animals.find(animal => animal.id === id);
  };

  const updateAnimalGroup = async (animalId: string, newGroupId: string) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal => 
      animal.id === animalId ? { ...animal, groupId: newGroupId } : animal
    ));

    if (supabase) {
      try {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ group_id: newGroupId })
            .eq('id', animalId),
          null
        );
      } catch (error) {
        console.error('Ошибка при обновлении группы животного:', error);
      }
    }
  };

  const addAnimal = async (newAnimal: Omit<Animal, 'id'>): Promise<Animal> => {
    const animal = createEmptyAnimal(newAnimal);
    
    // Добавляем локально немедленно
    setAnimals(prev => [...prev, animal]);

    if (supabase) {
      try {
        console.log('Сохранение животного в Supabase:', animal);
        
        const animalData = {
          id: animal.id,
          name: animal.name || animal.number,
          number: animal.number,
          group_id: animal.groupId,
          status: animal.status,
          birth_date: animal.birthDate || null,
          gender: animal.gender,
          mother_id: animal.motherId || null,
          last_calving_date: animal.lastCalvingDate || null,
          last_insemination_date: animal.lastInseminationDate || null,
          insemination_count: animal.inseminationCount || 0,
          is_under_treatment: animal.isUnderTreatment || false,
          has_mastitis: animal.hasMastitis || false,
          mastitis_start_date: animal.mastitisStartDate || null,
          next_calving_date: animal.nextCalvingDate || null,
          lactation: animal.lactation || 0,
          responder: animal.responder || null,
          weight: animal.weight || null
        };

        // Используем safeSupabaseQuery для надежного сохранения
        const insertedData = await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .insert([animalData])
            .select(),
          null
        );
          
        if (insertedData && Array.isArray(insertedData) && insertedData.length > 0) {
          console.log('Животное успешно сохранено в Supabase:', insertedData[0]);
          
          if (insertedData[0].id !== animal.id) {
            setAnimals(prev => prev.map(a => 
              a.id === animal.id ? { ...a, id: insertedData[0].id } : a
            ));
            return { ...animal, id: insertedData[0].id };
          }
        }
      } catch (err) {
        console.error('Ошибка при сохранении животного в базу данных:', err);
      }
    }
    
    return animal;
  };

  const updateAnimalStatus = (animalId: string, status: string) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal =>
      animal.id === animalId ? { ...animal, status } : animal
    ));
    
    if (supabase) {
      (async () => {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ status })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  const updateAnimalInsemination = (animalId: string, date: string) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal => {
      if (animal.id === animalId) {
        return {
          ...animal,
          status: 'Осем',
          lastInseminationDate: date,
          inseminationCount: animal.inseminationCount + 1
        };
      }
      return animal;
    }));
    
    if (supabase) {
      (async () => {
        // Вычисляем новое количество осеменений
        const currentAnimal = animals.find(a => a.id === animalId);
        const newCount = (currentAnimal?.inseminationCount || 0) + 1;
        
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ 
              status: 'Осем', 
              last_insemination_date: date,
              insemination_count: newCount
            })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  const updateAnimalCalving = (animalId: string, date: string, hasMastitis?: boolean) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal => {
      if (animal.id === animalId) {
        return {
          ...animal,
          status: 'Молоз',
          lastCalvingDate: date,
          lastInseminationDate: undefined,
          hasMastitis: hasMastitis || false,
          mastitisStartDate: hasMastitis ? date : undefined
        };
      }
      return animal;
    }));
    
    if (supabase) {
      (async () => {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ 
              status: 'Молоз', 
              last_calving_date: date,
              last_insemination_date: null,
              has_mastitis: hasMastitis || false,
              mastitis_start_date: hasMastitis ? date : null
            })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  const updateAnimal = (animalId: string, updatedData: Partial<Animal>) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal => {
      if (animal.id === animalId) {
        const updatedAnimal = {
          ...animal,
          ...updatedData
        };

        // Преобразование и проверка числовых полей
        if (updatedData.lactation !== undefined) {
          updatedAnimal.lactation = typeof updatedData.lactation === 'string' 
            ? parseInt(updatedData.lactation) || 0 
            : updatedData.lactation || 0;
        }
        
        if (updatedData.inseminationCount !== undefined) {
          updatedAnimal.inseminationCount = updatedData.inseminationCount;
        }
        
        if (updatedData.weight !== undefined) {
          updatedAnimal.weight = typeof updatedData.weight === 'string'
            ? parseFloat(updatedData.weight) || undefined
            : updatedData.weight;
        }
        
        if (updatedData.daysInMilk !== undefined) {
          updatedAnimal.daysInMilk = typeof updatedData.daysInMilk === 'string'
            ? parseInt(updatedData.daysInMilk) || 0
            : updatedData.daysInMilk;
        }

        return updatedAnimal;
      }
      return animal;
    }));

    if (supabase) {
      try {
        // Подготавливаем данные для Supabase (snake_case)
        const updateData: any = {};
        
        if (updatedData.name !== undefined) updateData.name = updatedData.name;
        if (updatedData.groupId !== undefined) updateData.group_id = updatedData.groupId;
        if (updatedData.status !== undefined) updateData.status = updatedData.status;
        
        // Обработка дат с проверкой на пустые строки
        if (updatedData.birthDate !== undefined) 
          updateData.birth_date = updatedData.birthDate === '' ? null : updatedData.birthDate;
        
        if (updatedData.nextCalvingDate !== undefined) 
          updateData.next_calving_date = updatedData.nextCalvingDate === '' ? null : updatedData.nextCalvingDate;
        
        if (updatedData.lastCalvingDate !== undefined) 
          updateData.last_calving_date = updatedData.lastCalvingDate === '' ? null : updatedData.lastCalvingDate;
        
        if (updatedData.lastInseminationDate !== undefined) 
          updateData.last_insemination_date = updatedData.lastInseminationDate === '' ? null : updatedData.lastInseminationDate;
        
        if (updatedData.mastitisStartDate !== undefined) 
          updateData.mastitis_start_date = updatedData.mastitisStartDate === '' ? null : updatedData.mastitisStartDate;
        
        if (updatedData.treatmentEndDate !== undefined) 
          updateData.treatment_end_date = updatedData.treatmentEndDate === '' ? null : updatedData.treatmentEndDate;
        
        if (updatedData.treatmentEndExecutorId !== undefined) 
          updateData.treatment_end_executor_id = updatedData.treatmentEndExecutorId === '' ? null : updatedData.treatmentEndExecutorId;
        
        // Обработка числовых полей
        if (updatedData.lactation !== undefined) 
          updateData.lactation = typeof updatedData.lactation === 'string' 
            ? parseInt(updatedData.lactation) || 0 
            : updatedData.lactation;
        
        if (updatedData.inseminationCount !== undefined) 
          updateData.insemination_count = updatedData.inseminationCount;
        
        if (updatedData.responder !== undefined) 
          updateData.responder = updatedData.responder;
        
        if (updatedData.weight !== undefined) 
          updateData.weight = typeof updatedData.weight === 'string'
            ? parseFloat(updatedData.weight) || null
            : updatedData.weight;
        
        if (updatedData.daysInMilk !== undefined) 
          updateData.days_in_milk = typeof updatedData.daysInMilk === 'string'
            ? parseInt(updatedData.daysInMilk) || null
            : updatedData.daysInMilk;
        
        // Булевы поля
        if (updatedData.isUnderTreatment !== undefined) 
          updateData.is_under_treatment = updatedData.isUnderTreatment;
        
        if (updatedData.hasMastitis !== undefined) 
          updateData.has_mastitis = updatedData.hasMastitis;
        
        if (Object.keys(updateData).length > 0) {
          (async () => {
            // Используем safeSupabaseQuery для надежного обновления
            await safeSupabaseQuery(
              () => supabase
                .from('animals')
                .update(updateData)
                .eq('id', animalId),
              null
            );
            console.log('Животное успешно обновлено в Supabase:', animalId);
          })();
        }
      } catch (err) {
        console.error('Ошибка при подготовке данных для Supabase:', err);
      }
    }
  };

  const startAnimalTreatment = (animalId: string) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal =>
      animal.id === animalId
        ? { ...animal, isUnderTreatment: true }
        : animal
    ));
    
    if (supabase) {
      (async () => {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ is_under_treatment: true })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  const endAnimalTreatment = (animalId: string, executorId: string) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal =>
      animal.id === animalId
        ? {
            ...animal,
            isUnderTreatment: false,
            treatmentEndDate: new Date().toISOString(),
            treatmentEndExecutorId: executorId
          }
        : animal
    ));
    
    if (supabase) {
      (async () => {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ 
              is_under_treatment: false,
              treatment_end_date: new Date().toISOString(),
              treatment_end_executor_id: executorId
            })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  const setAnimalMastitis = (animalId: string, hasMastitis: boolean) => {
    // Обновляем локальные данные немедленно
    setAnimals(prev => prev.map(animal =>
      animal.id === animalId
        ? {
            ...animal,
            hasMastitis,
            mastitisStartDate: hasMastitis ? new Date().toISOString() : undefined
          }
        : animal
    ));
    
    if (supabase) {
      (async () => {
        // Используем safeSupabaseQuery для надежного обновления
        await safeSupabaseQuery(
          () => supabase
            .from('animals')
            .update({ 
              has_mastitis: hasMastitis,
              mastitis_start_date: hasMastitis ? new Date().toISOString() : null
            })
            .eq('id', animalId),
          null
        );
      })();
    }
  };

  return (
    <MovementsContext.Provider value={{ 
      movements, 
      animals, 
      addMovement, 
      getMovementById, 
      getAnimalById,
      updateAnimalGroup,
      addAnimal,
      updateAnimalStatus,
      updateAnimalInsemination,
      updateAnimalCalving,
      updateAnimal,
      startAnimalTreatment,
      endAnimalTreatment,
      setAnimalMastitis
    }}>
      {children}
    </MovementsContext.Provider>
  );
};

export const useMovements = () => {
  const context = useContext(MovementsContext);
  if (context === undefined) {
    throw new Error('useMovements must be used within a MovementsProvider');
  }
  return context;
};