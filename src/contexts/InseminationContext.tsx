import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

export interface Bull {
  id: string;
  code: string;
  name: string;
  price: number;
  remainingDoses: number;
}

export interface Insemination {
  id: string;
  date: string;
  time: string;
  animalId: string;
  bullId: string;
  executorId: string;
  status: 'ОСЕМ' | 'СТЕЛ' | 'ЯЛОВАЯ';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

interface InseminationLog {
  id: string;
  inseminationId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  timestamp: string;
}

interface InseminationContextType {
  bulls: Bull[];
  inseminations: Insemination[];
  isLoading: boolean;
  error: string | null;
  addBull: (bull: Omit<Bull, 'id'>) => Promise<Bull | null>;
  updateBull: (id: string, bull: Partial<Bull>) => Promise<void>;
  deleteBull: (id: string) => Promise<void>;
  addInsemination: (insemination: Omit<Insemination, 'id'>) => Promise<Insemination | null>;
  deleteInsemination: (id: string, reason: string) => Promise<void>;
  getBullById: (id: string) => Bull | undefined;
  getInseminationsByAnimalId: (animalId: string) => Insemination[];
  getLatestInsemination: (animalId: string) => Insemination | undefined;
}

// Функция для проверки и преобразования строк в валидные UUID
const ensureValidUuid = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  
  // Регулярное выражение для проверки UUID формата
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(value)) {
    return value;
  } else {
    console.warn(`Значение "${value}" не является валидным UUID. Будет создан новый UUID.`);
    // Если это не валидный UUID, генерируем новый
    return crypto.randomUUID();
  }
};

const InseminationContext = createContext<InseminationContextType | undefined>(undefined);

export const InseminationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [inseminationLogs, setInseminationLogs] = useState<InseminationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useUser();

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);

  // Функция загрузки данных из Supabase или localStorage
  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Загрузка быков
      await loadBulls();
      
      // Загрузка осеменений
      await loadInseminations();
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError('Произошла ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка быков
  const loadBulls = async () => {
    try {
      if (!supabase) {
        console.log('Supabase не инициализирован, используем моковые данные для быков');
        // Если Supabase не инициализирован, используем моковые данные
        setBulls([
          { id: '1', code: 'BULL-001', name: 'Бык 1', price: 5000, remainingDoses: 10 },
          { id: '2', code: 'BULL-002', name: 'Бык 2', price: 6000, remainingDoses: 15 }
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('bulls')
        .select('*')
        .order('code');

      if (error) {
        console.error('Ошибка при загрузке быков из Supabase:', error.message);
        // Используем моковые данные при ошибке
        setBulls([
          { id: '1', code: 'BULL-001', name: 'Бык 1', price: 5000, remainingDoses: 10 },
          { id: '2', code: 'BULL-002', name: 'Бык 2', price: 6000, remainingDoses: 15 }
        ]);
      } else if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedBulls: Bull[] = data.map(bull => ({
          id: bull.id,
          code: bull.code,
          name: bull.name,
          price: bull.price,
          remainingDoses: bull.remaining_doses
        }));
        setBulls(formattedBulls);
        console.log('Загружено быков:', formattedBulls.length);
      }
    } catch (err) {
      console.error('Ошибка при загрузке быков:', err);
      // Используем моковые данные при ошибке
      setBulls([
        { id: '1', code: 'BULL-001', name: 'Бык 1', price: 5000, remainingDoses: 10 },
        { id: '2', code: 'BULL-002', name: 'Бык 2', price: 6000, remainingDoses: 15 }
      ]);
    }
  };

  // Загрузка осеменений
  const loadInseminations = async () => {
    try {
      if (!supabase) {
        // Если Supabase не инициализирован, используем моковые данные
        setInseminations([]);
        return;
      }

      const { data, error } = await supabase
        .from('inseminations')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Ошибка при загрузке осеменений из Supabase:', error.message);
        // Используем моковые данные при ошибке
        setInseminations([]);
      } else if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedInseminations: Insemination[] = data.map(insem => ({
          id: insem.id,
          date: insem.date,
          time: insem.time,
          animalId: insem.animal_id,
          bullId: insem.bull_id,
          executorId: insem.executor_id,
          status: insem.status,
          isDeleted: insem.is_deleted,
          deletedAt: insem.deleted_at,
          deletedBy: insem.deleted_by,
          deletionReason: insem.deletion_reason
        }));
        setInseminations(formattedInseminations);
        console.log('Загружено осеменений:', formattedInseminations.length);
      }
    } catch (err) {
      console.error('Ошибка при загрузке осеменений:', err);
      setError('Произошла ошибка при загрузке осеменений');
      // Используем пустой массив при ошибке
      setInseminations([]);
    }
  };

  // Проверка существования пользователя в БД
  const checkUserExists = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    if (!supabase) return true; // В режиме мока считаем, что пользователь существует
    
    try {
      console.log('Проверка существования пользователя с ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Ошибка при проверке наличия пользователя:', error.message);
        return false;
      }
      
      if (data) {
        console.log('Найден пользователь с ID:', userId);
        return true;
      } else {
        console.error('Пользователь не найден в базе данных:', userId);
        // Получаем список всех пользователей для отладки
        await listAllUsers();
        return false;
      }
    } catch (err) {
      console.error('Ошибка при проверке наличия пользователя:', err);
      return false;
    }
  };

  // Получение всех пользователей из базы данных (для отладки)
  const listAllUsers = async (): Promise<void> => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) {
        console.error('Ошибка при получении списка пользователей:', error.message);
      } else {
        console.log('Список всех пользователей в базе данных:', data);
      }
    } catch (err) {
      console.error('Ошибка при получении списка пользователей:', err);
    }
  };

  const addBull = async (newBull: Omit<Bull, 'id'>): Promise<Bull | null> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, добавляем локально
        const bull = { ...newBull, id: String(Date.now()) };
        setBulls(prev => [...prev, bull]);
        return bull;
      }

      const { data, error } = await supabase
        .from('bulls')
        .insert([{
          code: newBull.code,
          name: newBull.name,
          price: newBull.price,
          remaining_doses: newBull.remainingDoses
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при добавлении быка:', error.message);
        setError(`Ошибка при добавлении быка: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const bull: Bull = {
          id: data[0].id,
          code: data[0].code,
          name: data[0].name,
          price: data[0].price,
          remainingDoses: data[0].remaining_doses
        };
        
        setBulls(prev => [...prev, bull]);
        return bull;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при добавлении быка:', err);
      setError('Не удалось добавить быка');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBull = async (id: string, updatedBull: Partial<Bull>): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, обновляем локально
        setBulls(prev => prev.map(bull => 
          bull.id === id ? { ...bull, ...updatedBull } : bull
        ));
        return;
      }

      // Подготавливаем данные для обновления в формате БД
      const updateData: any = {};
      if (updatedBull.code !== undefined) updateData.code = updatedBull.code;
      if (updatedBull.name !== undefined) updateData.name = updatedBull.name;
      if (updatedBull.price !== undefined) updateData.price = updatedBull.price;
      if (updatedBull.remainingDoses !== undefined) updateData.remaining_doses = updatedBull.remainingDoses;

      const { error } = await supabase
        .from('bulls')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении быка:', error.message);
        setError(`Ошибка при обновлении быка: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setBulls(prev => prev.map(bull => 
        bull.id === id ? { ...bull, ...updatedBull } : bull
      ));
    } catch (err) {
      console.error('Ошибка при обновлении быка:', err);
      setError('Не удалось обновить данные быка');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBull = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, удаляем локально
        setBulls(prev => prev.filter(bull => bull.id !== id));
        return;
      }

      const { error } = await supabase
        .from('bulls')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении быка:', error.message);
        setError(`Ошибка при удалении быка: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setBulls(prev => prev.filter(bull => bull.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении быка:', err);
      setError('Не удалось удалить быка');
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка существования быка в БД
  const checkBullExists = async (bullId: string): Promise<boolean> => {
    // Проверяем в локальном состоянии сначала
    const bullExists = bulls.some(bull => bull.id === bullId);
    if (bullExists) return true;
    
    if (!supabase) return false;
    
    try {
      const { data, error } = await supabase
        .from('bulls')
        .select('id')
        .eq('id', bullId)
        .maybeSingle();
      
      if (error) {
        console.error('Ошибка при проверке наличия быка:', error.message);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error('Ошибка при проверке наличия быка:', err);
      return false;
    }
  };

  // Проверка существования исполнителя в БД
  const checkExecutorExists = async (executorId: string): Promise<boolean> => {
    if (!supabase) return true; // В режиме мока считаем, что исполнитель существует
    
    try {
      console.log('Проверка существования исполнителя с ID:', executorId);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, role')
        .eq('id', executorId)
        .maybeSingle();
      
      if (error) {
        console.error('Ошибка при проверке наличия исполнителя:', error.message);
        return false;
      }
      
      if (data) {
        console.log('Найден исполнитель:', data);
        return true;
      } else {
        console.error('Исполнитель не найден в базе данных:', executorId);
        return false;
      }
    } catch (err) {
      console.error('Ошибка при проверке наличия исполнителя:', err);
      return false;
    }
  };

  const addInsemination = async (newInsemination: Omit<Insemination, 'id'>): Promise<Insemination | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Проверяем, что все необходимые поля заполнены
      if (!newInsemination.animalId || !newInsemination.bullId || !newInsemination.executorId) {
        setError('Все обязательные поля должны быть заполнены');
        return null;
      }
      
      if (!supabase) {
        // Если Supabase не инициализирован, добавляем локально
        const insemination: Insemination = { 
          ...newInsemination, 
          id: String(Date.now() + Math.random())
        };
        
        setInseminations(prev => [...prev, insemination]);
        
        return insemination;
      }

      // Для отладки - вывести список всех пользователей
      await listAllUsers();

      // Проверяем и обеспечиваем, что ID животного, быка и исполнителя являются валидными UUID
      const validAnimalId = ensureValidUuid(newInsemination.animalId);
      const validBullId = ensureValidUuid(newInsemination.bullId);
      const validExecutorId = ensureValidUuid(newInsemination.executorId);

      console.log('Добавление осеменения:', {
        animalId: validAnimalId,
        bullId: validBullId,
        executorId: validExecutorId,
        date: newInsemination.date,
        status: newInsemination.status
      });
      
      // Проверяем существование быка перед добавлением осеменения
      const bullExists = await checkBullExists(validBullId!);
      
      if (!bullExists) {
        const errorMsg = `Ошибка: Бык с ID ${validBullId} не существует в базе данных`;
        console.error(errorMsg);
        setError(errorMsg);
        return null;
      }

      // Проверяем существование исполнителя перед добавлением осеменения
      if (!validExecutorId) {
        const errorMsg = `Ошибка: ID исполнителя не указан или некорректен`;
        console.error(errorMsg);
        setError(errorMsg);
        return null;
      }
      
      const executorExists = await checkExecutorExists(validExecutorId);
      
      if (!executorExists) {
        const errorMsg = `Ошибка: Исполнитель с ID ${validExecutorId} не существует в базе данных`;
        console.error(errorMsg);
        setError(errorMsg);
        return null;
      }

      // Добавление осеменения в Supabase
      const { data, error } = await supabase
        .from('inseminations')
        .insert([{
          date: newInsemination.date,
          time: newInsemination.time,
          animal_id: validAnimalId,
          bull_id: validBullId,
          executor_id: validExecutorId,
          status: newInsemination.status,
          is_deleted: false
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при добавлении осеменения:', error.message);
        
        // Проверяем, связана ли ошибка с нарушением внешнего ключа
        if (error.message.includes('violates foreign key constraint') && error.message.includes('bull_id')) {
          setError(`Ошибка: Бык с указанным ID не существует в базе данных`);
        } else if (error.message.includes('violates foreign key constraint') && error.message.includes('animal_id')) {
          setError(`Ошибка: Животное с указанным ID не существует в базе данных`);
        } else if (error.message.includes('violates foreign key constraint') && error.message.includes('executor_id')) {
          setError(`Ошибка: Исполнитель с указанным ID не существует в базе данных`);
        } else {
          setError(`Ошибка при добавлении осеменения: ${error.message}`);
        }
        
        return null;
      }
      
      if (data && data[0]) {
        const insemination: Insemination = {
          id: data[0].id,
          date: data[0].date,
          time: data[0].time,
          animalId: data[0].animal_id,
          bullId: data[0].bull_id,
          executorId: data[0].executor_id,
          status: data[0].status
        };
        
        setInseminations(prev => [...prev, insemination]);
        
        return insemination;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при добавлении осеменения:', err);
      setError('Не удалось добавить осеменение');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInsemination = async (id: string, reason: string): Promise<void> => {
    try {
      if (!reason.trim()) {
        setError('Необходимо указать причину удаления');
        return;
      }

      setIsLoading(true);
      
      // Находим удаляемое осеменение
      const inseminationToDelete = inseminations.find(i => i.id === id);
      if (!inseminationToDelete) {
        setError('Осеменение не найдено');
        return;
      }

      if (!supabase) {
        // Если Supabase не инициализирован, обновляем локально
        const deletedAt = new Date().toISOString();
        
        setInseminations(prev => prev.map(insemination => 
          insemination.id === id 
            ? { 
                ...insemination, 
                isDeleted: true,
                deletedAt,
                deletedBy: currentUser?.id,
                deletionReason: reason
              } 
            : insemination
        ));
        
        // Возвращаем дозу быку при удалении осеменения
        if (inseminationToDelete.bullId) {
          const bull = getBullById(inseminationToDelete.bullId);
          if (bull) {
            updateBull(inseminationToDelete.bullId, {
              remainingDoses: bull.remainingDoses + 1
            });
          }
        }
        
        return;
      }

      // Помечаем осеменение как удаленное в Supabase
      const deletedAt = new Date().toISOString();
      let validUserId = undefined;
      
      if (currentUser && currentUser.id) {
        validUserId = ensureValidUuid(currentUser.id);
      }
      
      const { error } = await supabase
        .from('inseminations')
        .update({
          is_deleted: true,
          deleted_at: deletedAt,
          deleted_by: validUserId,
          deletion_reason: reason
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении осеменения:', error.message);
        setError(`Ошибка при удалении осеменения: ${error.message}`);
        return;
      }
      
      // Добавляем запись в журнал действий только если пользователь существует
      if (currentUser && currentUser.id && validUserId) {
        // Проверяем, существует ли пользователь в базе данных
        const userExists = await checkUserExists(validUserId);
        
        if (userExists) {
          // Пользователь существует, можно добавить запись в журнал
          await supabase
            .from('insemination_logs')
            .insert([{
              insemination_id: id,
              user_id: validUserId,
              action: 'DELETE',
              details: `Удалено осеменение. Причина: ${reason}`,
              timestamp: deletedAt
            }]);
        } else {
          console.warn(`Запись в журнал не добавлена: пользователь с ID ${validUserId} не существует в базе данных`);
        }
      } else {
        console.warn("ID пользователя не найден или некорректен, запись в журнал не будет добавлена");
      }
      
      // Обновляем локальное состояние
      setInseminations(prev => prev.map(insemination => 
        insemination.id === id 
          ? { 
              ...insemination, 
              isDeleted: true,
              deletedAt,
              deletedBy: currentUser?.id,
              deletionReason: reason
            } 
          : insemination
      ));
      
      // Возвращаем дозу быку при удалении осеменения
      if (inseminationToDelete.bullId) {
        const bull = getBullById(inseminationToDelete.bullId);
        if (bull) {
          // Обновляем локальное состояние
          setBulls(prev => prev.map(b => 
            b.id === bull.id ? { ...b, remainingDoses: b.remainingDoses + 1 } : b
          ));
          
          // Обновляем в базе данных
          await supabase
            .from('bulls')
            .update({ remaining_doses: bull.remainingDoses + 1 })
            .eq('id', bull.id);
        }
      }
      
    } catch (err) {
      console.error('Ошибка при удалении осеменения:', err);
      setError('Не удалось удалить осеменение');
    } finally {
      setIsLoading(false);
    }
  };

  const getBullById = (id: string) => {
    return bulls.find(bull => bull.id === id);
  };

  const getInseminationsByAnimalId = (animalId: string) => {
    return inseminations
      .filter(insemination => insemination.animalId === animalId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getLatestInsemination = (animalId: string) => {
    return inseminations
      .filter(insemination => insemination.animalId === animalId && !insemination.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  return (
    <InseminationContext.Provider value={{ 
      bulls,
      inseminations,
      isLoading,
      error,
      addBull,
      updateBull,
      deleteBull,
      addInsemination,
      deleteInsemination,
      getBullById,
      getInseminationsByAnimalId,
      getLatestInsemination
    }}>
      {children}
    </InseminationContext.Provider>
  );
};

export const useInsemination = () => {
  const context = useContext(InseminationContext);
  if (context === undefined) {
    throw new Error('useInsemination must be used within an InseminationProvider');
  }
  return context;
};