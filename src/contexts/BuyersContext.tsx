import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

export interface Buyer {
  id: string;
  name: string;
  phone: string;
  vehicleNumber: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: string;
}

interface BuyersContextType {
  buyers: Buyer[];
  isLoading: boolean;
  error: string | null;
  addBuyer: (buyer: Omit<Buyer, 'id' | 'isActive' | 'createdAt'>) => Promise<Buyer | null>;
  updateBuyer: (id: string, buyer: Partial<Buyer>) => Promise<void>;
  toggleBuyerStatus: (id: string) => Promise<void>;
  deleteBuyer: (id: string) => Promise<void>;
  getBuyerById: (id: string) => Buyer | undefined;
}

const BuyersContext = createContext<BuyersContextType | undefined>(undefined);

export const BuyersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useUser();

  // Загрузка покупателей при монтировании компонента
  React.useEffect(() => {
    const loadBuyers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!supabase) {
          // Если Supabase не инициализирован, используем моковые данные
          setBuyers([
            { 
              id: '1', 
              name: 'ООО "Агрокомплекс"', 
              phone: '+7 (999) 123-45-67',
              vehicleNumber: 'А123БВ 36',
              address: 'г. Воронеж, ул. Ленина, 15',
              contactPerson: 'Иванов Иван Иванович',
              isActive: true,
              createdAt: new Date().toISOString()
            },
            { 
              id: '2', 
              name: 'КФХ "Заря"', 
              phone: '+7 (999) 765-43-21',
              vehicleNumber: 'В567ГД 36',
              address: 'Воронежская обл., Семилукский р-н',
              contactPerson: 'Петров Петр Петрович',
              isActive: true,
              createdAt: new Date().toISOString()
            },
            { 
              id: '3', 
              name: 'ИП Сидоров А.А.', 
              phone: '+7 (999) 111-22-33',
              vehicleNumber: 'Е789ЖЗ 36',
              address: 'г. Воронеж, ул. Кирова, 5',
              contactPerson: 'Сидоров Алексей Александрович',
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ]);
          setIsLoading(false);
          return;
        }

        // Запрос к Supabase для получения покупателей
        const { data, error } = await supabase
          .from('buyers')
          .select('*')
          .order('name');
        
        if (error) {
          console.error('Ошибка при загрузке покупателей:', error.message);
          setError(`Ошибка при загрузке покупателей: ${error.message}`);
          
          // Используем моковые данные при ошибке
          setBuyers([
            { 
              id: '1', 
              name: 'ООО "Агрокомплекс"', 
              phone: '+7 (999) 123-45-67',
              vehicleNumber: 'А123БВ 36',
              address: 'г. Воронеж, ул. Ленина, 15',
              contactPerson: 'Иванов Иван Иванович',
              isActive: true,
              createdAt: new Date().toISOString()
            },
            { 
              id: '2', 
              name: 'КФХ "Заря"', 
              phone: '+7 (999) 765-43-21',
              vehicleNumber: 'В567ГД 36',
              address: 'Воронежская обл., Семилукский р-н',
              contactPerson: 'Петров Петр Петрович',
              isActive: true,
              createdAt: new Date().toISOString()
            },
            { 
              id: '3', 
              name: 'ИП Сидоров А.А.', 
              phone: '+7 (999) 111-22-33',
              vehicleNumber: 'Е789ЖЗ 36',
              address: 'г. Воронеж, ул. Кирова, 5',
              contactPerson: 'Сидоров Алексей Александрович',
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ]);
        } else if (data) {
          // Приводим данные из БД к формату нашего интерфейса
          const formattedBuyers: Buyer[] = data.map(buyer => ({
            id: buyer.id,
            name: buyer.name,
            phone: buyer.phone,
            vehicleNumber: buyer.vehicle_number,
            address: buyer.address,
            contactPerson: buyer.contact_person,
            isActive: buyer.is_active,
            createdAt: buyer.created_at
          }));
          setBuyers(formattedBuyers);
        }
      } catch (err) {
        console.error('Ошибка при загрузке покупателей:', err);
        setError('Не удалось загрузить список покупателей');
        
        // Используем моковые данные при ошибке
        setBuyers([
          { 
            id: '1', 
            name: 'ООО "Агрокомплекс"', 
            phone: '+7 (999) 123-45-67',
            vehicleNumber: 'А123БВ 36',
            address: 'г. Воронеж, ул. Ленина, 15',
            contactPerson: 'Иванов Иван Иванович',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          { 
            id: '2', 
            name: 'КФХ "Заря"', 
            phone: '+7 (999) 765-43-21',
            vehicleNumber: 'В567ГД 36',
            address: 'Воронежская обл., Семилукский р-н',
            contactPerson: 'Петров Петр Петрович',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          { 
            id: '3', 
            name: 'ИП Сидоров А.А.', 
            phone: '+7 (999) 111-22-33',
            vehicleNumber: 'Е789ЖЗ 36',
            address: 'г. Воронеж, ул. Кирова, 5',
            contactPerson: 'Сидоров Алексей Александрович',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBuyers();
  }, []);

  // Проверка существования пользователя в БД
  const checkUserExists = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    if (!supabase) return true; // В режиме мока считаем, что пользователь существует
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Ошибка при проверке наличия пользователя:', error.message);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error('Ошибка при проверке наличия пользователя:', err);
      return false;
    }
  };

  const addBuyer = async (newBuyer: Omit<Buyer, 'id' | 'isActive' | 'createdAt'>): Promise<Buyer | null> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        // Если Supabase не инициализирован, добавляем локально
        const buyer: Buyer = { 
          ...newBuyer, 
          id: String(Date.now()),
          isActive: true,
          createdAt: new Date().toISOString()
        };
        setBuyers(prev => [...prev, buyer]);
        return buyer;
      }

      // Добавление покупателя в Supabase
      const { data, error } = await supabase
        .from('buyers')
        .insert([{
          name: newBuyer.name,
          phone: newBuyer.phone,
          vehicle_number: newBuyer.vehicleNumber,
          address: newBuyer.address,
          contact_person: newBuyer.contactPerson,
          is_active: true
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при добавлении покупателя:', error.message);
        setError(`Ошибка при добавлении покупателя: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const buyer: Buyer = {
          id: data[0].id,
          name: data[0].name,
          phone: data[0].phone,
          vehicleNumber: data[0].vehicle_number,
          address: data[0].address,
          contactPerson: data[0].contact_person,
          isActive: data[0].is_active,
          createdAt: data[0].created_at
        };
        
        setBuyers(prev => [...prev, buyer]);
        return buyer;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при добавлении покупателя:', err);
      setError('Не удалось добавить покупателя');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBuyer = async (id: string, updatedBuyer: Partial<Buyer>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        // Если Supabase не инициализирован, обновляем локально
        setBuyers(prev => prev.map(buyer => 
          buyer.id === id ? { ...buyer, ...updatedBuyer } : buyer
        ));
        return;
      }

      // Подготавливаем данные для обновления в формате БД
      const updateData: any = {};
      if (updatedBuyer.name !== undefined) updateData.name = updatedBuyer.name;
      if (updatedBuyer.phone !== undefined) updateData.phone = updatedBuyer.phone;
      if (updatedBuyer.vehicleNumber !== undefined) updateData.vehicle_number = updatedBuyer.vehicleNumber;
      if (updatedBuyer.address !== undefined) updateData.address = updatedBuyer.address;
      if (updatedBuyer.contactPerson !== undefined) updateData.contact_person = updatedBuyer.contactPerson;
      if (updatedBuyer.isActive !== undefined) updateData.is_active = updatedBuyer.isActive;

      // Обновление покупателя в Supabase
      const { error } = await supabase
        .from('buyers')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении покупателя:', error.message);
        setError(`Ошибка при обновлении покупателя: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setBuyers(prev => prev.map(buyer => 
        buyer.id === id ? { ...buyer, ...updatedBuyer } : buyer
      ));
    } catch (err) {
      console.error('Ошибка при обновлении покупателя:', err);
      setError('Не удалось обновить данные покупателя');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBuyerStatus = async (id: string): Promise<void> => {
    try {
      const buyer = buyers.find(b => b.id === id);
      if (!buyer) return;

      setIsLoading(true);
      setError(null);

      if (!supabase) {
        // Если Supabase не инициализирован, обновляем локально
        setBuyers(prev => prev.map(b => 
          b.id === id ? { ...b, isActive: !b.isActive } : b
        ));
        return;
      }

      // Обновление статуса покупателя в Supabase
      const { error } = await supabase
        .from('buyers')
        .update({ is_active: !buyer.isActive })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при изменении статуса покупателя:', error.message);
        setError(`Ошибка при изменении статуса покупателя: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setBuyers(prev => prev.map(b => 
        b.id === id ? { ...b, isActive: !b.isActive } : b
      ));
    } catch (err) {
      console.error('Ошибка при изменении статуса покупателя:', err);
      setError('Не удалось изменить статус покупателя');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBuyer = async (id: string): Promise<void> => {
    try {
      // Проверяем, имеет ли пользователь права на удаление
      const isAdmin = currentUser?.role === 'ADMIN';
      const isManager = currentUser?.role === 'MANAGER';
      
      if (!isAdmin && !isManager) {
        setError('У вас нет прав на удаление покупателей');
        return;
      }

      setIsLoading(true);
      setError(null);

      if (!supabase) {
        // Если Supabase не инициализирован, удаляем локально
        setBuyers(prev => prev.filter(b => b.id !== id));
        return;
      }

      // Проверяем существование пользователя перед добавлением записи в журнал
      const userId = currentUser?.id;
      if (userId) {
        const userExists = await checkUserExists(userId);
        if (userExists) {
          // Создаем запись в журнале действий только если пользователь существует
          await supabase
            .from('action_logs')
            .insert([{
              user_id: userId,
              action_type: 'DELETE_BUYER',
              entity_id: id,
              details: `Удалил покупателя (${new Date().toISOString()})`,
              created_at: new Date().toISOString()
            }]);
        } else {
          console.warn(`Пользователь с ID ${userId} не найден в базе данных. Запись в журнал не добавлена.`);
        }
      } else {
        console.warn('ID пользователя не определен. Запись в журнал не добавлена.');
      }

      // Удаление покупателя из Supabase
      const { error } = await supabase
        .from('buyers')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении покупателя:', error.message);
        setError(`Ошибка при удалении покупателя: ${error.message}`);
        return;
      }
      
      // Обновляем локальное состояние
      setBuyers(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении покупателя:', err);
      setError('Не удалось удалить покупателя');
    } finally {
      setIsLoading(false);
    }
  };

  const getBuyerById = (id: string): Buyer | undefined => {
    return buyers.find(buyer => buyer.id === id);
  };

  return (
    <BuyersContext.Provider value={{
      buyers,
      isLoading,
      error,
      addBuyer,
      updateBuyer,
      toggleBuyerStatus,
      deleteBuyer,
      getBuyerById
    }}>
      {children}
    </BuyersContext.Provider>
  );
};

export const useBuyers = () => {
  const context = useContext(BuyersContext);
  if (context === undefined) {
    throw new Error('useBuyers must be used within a BuyersProvider');
  }
  return context;
};