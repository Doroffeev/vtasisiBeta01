import React, { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { format } from 'date-fns';

export interface Shipment {
  id: string;
  date: string;
  // Сохраняем поля для обратной совместимости
  animalId?: string;
  animalNumber?: string; 
  buyerId: string;
  buyerName?: string; 
  vehicleNumber: string;
  driverName: string;
  proxyNumber: string;
  releasedById: string;
  releaserName?: string; 
  acceptedBy: string;
  price?: number; // Цена для единичного животного (обратная совместимость)
  weight?: number; // Вес для единичного животного (обратная совместимость)
  totalAmount?: number; // Общая сумма отгрузки
  comments?: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  animals?: ShipmentAnimal[]; // Добавляем массив животных
}

export interface ShipmentAnimal {
  id: string;
  shipmentId: string;
  animalId: string;
  animalNumber: string;
  weight?: number;
  price?: number;
}

interface ShipmentLog {
  id: string;
  shipmentId: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  timestamp: string;
}

interface ShipmentsContextType {
  shipments: Shipment[];
  shipmentLogs: ShipmentLog[];
  isLoading: boolean;
  error: string | null;
  addShipment: (shipment: Omit<Shipment, 'id' | 'createdAt' | 'animalNumber' | 'buyerName' | 'releaserName' | 'animals'>, animals: {animalId: string, animalNumber: string, weight?: number, price?: number}[]) => Promise<Shipment | null>;
  deleteShipment: (id: string, reason: string) => Promise<void>;
  getShipmentById: (id: string) => Shipment | undefined;
  getShipmentLogsByShipmentId: (shipmentId: string) => ShipmentLog[];
  loadShipmentAnimals: (shipmentId: string) => Promise<ShipmentAnimal[]>;
}

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

const ShipmentsContext = createContext<ShipmentsContextType | undefined>(undefined);

export const ShipmentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentLogs, setShipmentLogs] = useState<ShipmentLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useUser();

  // Загрузка отгрузок при монтировании компонента
  React.useEffect(() => {
    const loadShipments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!supabase) {
          // Если Supabase не инициализирован, используем моковые данные
          setShipments([
            { 
              id: '1', 
              date: '2024-05-01',
              animalId: '1',
              animalNumber: '0122',
              buyerId: '1',
              buyerName: 'ООО "Агрокомплекс"',
              vehicleNumber: 'А123БВ 36',
              driverName: 'Иванов И.И.',
              proxyNumber: '12345',
              releasedById: '1',
              releaserName: 'Администратор',
              acceptedBy: 'Петров П.П.',
              price: 150000,
              weight: 450,
              totalAmount: 150000,
              comments: 'Комментарий к отгрузке',
              createdAt: '2024-05-01T10:00:00Z',
              animals: [
                {
                  id: '1',
                  shipmentId: '1',
                  animalId: '1',
                  animalNumber: '0122',
                  weight: 450,
                  price: 150000
                }
              ]
            },
            { 
              id: '2', 
              date: '2024-05-02',
              animalId: '2',
              animalNumber: '0123',
              buyerId: '2',
              buyerName: 'КФХ "Заря"',
              vehicleNumber: 'В567ГД 36',
              driverName: 'Петров П.П.',
              proxyNumber: '54321',
              releasedById: '1',
              releaserName: 'Администратор',
              acceptedBy: 'Сидоров С.С.',
              price: 160000,
              weight: 470,
              totalAmount: 160000,
              comments: 'Корова на мясо',
              createdAt: '2024-05-02T11:00:00Z',
              animals: [
                {
                  id: '2',
                  shipmentId: '2',
                  animalId: '2',
                  animalNumber: '0123',
                  weight: 470,
                  price: 160000
                }
              ]
            }
          ]);
          setShipmentLogs([
            {
              id: '1',
              shipmentId: '1',
              userId: '1',
              userName: 'Администратор',
              action: 'CREATE',
              details: 'Создана отгрузка животного №0122',
              timestamp: '2024-05-01T10:00:00Z'
            },
            {
              id: '2',
              shipmentId: '2',
              userId: '1',
              userName: 'Администратор',
              action: 'CREATE',
              details: 'Создана отгрузка животного №0123',
              timestamp: '2024-05-02T11:00:00Z'
            }
          ]);
          setIsLoading(false);
          return;
        }

        // Запрос к Supabase для получения отгрузок
        // Изменение: используем простой запрос без объединений, которые могут вызвать ошибку из-за отсутствия внешних ключей
        const { data, error } = await supabase
          .from('shipments')
          .select('*')
          .order('date', { ascending: false });
        
        if (error) {
          console.error('Ошибка при загрузке отгрузок:', error.message);
          setError(`Ошибка при загрузке отгрузок: ${error.message}`);
          
          // Используем моковые данные при ошибке
          setShipments([
            { 
              id: '1', 
              date: '2024-05-01',
              animalId: '1',
              animalNumber: '0122',
              buyerId: '1',
              buyerName: 'ООО "Агрокомплекс"',
              vehicleNumber: 'А123БВ 36',
              driverName: 'Иванов И.И.',
              proxyNumber: '12345',
              releasedById: '1',
              releaserName: 'Администратор',
              acceptedBy: 'Петров П.П.',
              price: 150000,
              weight: 450,
              totalAmount: 150000,
              comments: 'Комментарий к отгрузке',
              createdAt: '2024-05-01T10:00:00Z'
            },
            { 
              id: '2', 
              date: '2024-05-02',
              animalId: '2',
              animalNumber: '0123',
              buyerId: '2',
              buyerName: 'КФХ "Заря"',
              vehicleNumber: 'В567ГД 36',
              driverName: 'Петров П.П.',
              proxyNumber: '54321',
              releasedById: '1',
              releaserName: 'Администратор',
              acceptedBy: 'Сидоров С.С.',
              price: 160000,
              weight: 470,
              totalAmount: 160000,
              comments: 'Корова на мясо',
              createdAt: '2024-05-02T11:00:00Z'
            }
          ]);
        } else if (data) {
          // Преобразуем данные в формат нашего интерфейса
          const formattedShipments: Shipment[] = data.map(shipment => ({
            id: shipment.id,
            date: shipment.date,
            animalId: shipment.animal_id,
            animalNumber: shipment.animal_number, // Используем animal_number вместо animals?.number
            buyerId: shipment.buyer_id,
            buyerName: shipment.buyer_name, // Используем buyer_name вместо buyers?.name
            vehicleNumber: shipment.vehicle_number,
            driverName: shipment.driver_name,
            proxyNumber: shipment.proxy_number,
            releasedById: shipment.released_by_id,
            releaserName: shipment.releaser_name, // Используем releaser_name вместо users?.full_name
            acceptedBy: shipment.accepted_by,
            price: shipment.price,
            weight: shipment.weight,
            totalAmount: shipment.total_amount,
            comments: shipment.comments,
            createdAt: shipment.created_at,
            deletedAt: shipment.deleted_at,
            deletedBy: shipment.deleted_by,
            deletedReason: shipment.deleted_reason
          }));
          
          setShipments(formattedShipments);
        }

        // Загружаем животных для каждой отгрузки
        if (data && data.length > 0) {
          for (const shipment of data) {
            const { data: animalsData, error: animalsError } = await supabase
              .from('shipment_animals')
              .select('*')
              .eq('shipment_id', shipment.id);

            if (animalsError) {
              console.error('Ошибка при загрузке животных отгрузки:', animalsError.message);
            } else if (animalsData && animalsData.length > 0) {
              // Добавляем животных к отгрузке в локальном состоянии
              setShipments(prev => prev.map(s => {
                if (s.id === shipment.id) {
                  return {
                    ...s,
                    animals: animalsData.map(animal => ({
                      id: animal.id,
                      shipmentId: animal.shipment_id,
                      animalId: animal.animal_id,
                      animalNumber: animal.animal_number,
                      weight: animal.weight,
                      price: animal.price
                    }))
                  };
                }
                return s;
              }));
            }
          }
        }

        // Загружаем журнал действий с отгрузками
        const { data: logsData, error: logsError } = await supabase
          .from('shipment_logs')
          .select(`
            *,
            users (full_name)
          `)
          .order('timestamp', { ascending: false });

        if (logsError) {
          console.error('Ошибка при загрузке журнала отгрузок:', logsError.message);
        } else if (logsData) {
          // Преобразуем данные журнала в формат нашего интерфейса
          const formattedLogs: ShipmentLog[] = logsData.map(log => ({
            id: log.id,
            shipmentId: log.shipment_id,
            userId: log.user_id,
            userName: log.users?.full_name || 'Неизвестный пользователь',
            action: log.action,
            details: log.details,
            timestamp: log.timestamp
          }));
          
          setShipmentLogs(formattedLogs);
        }
      } catch (err) {
        console.error('Ошибка при загрузке отгрузок:', err);
        setError('Не удалось загрузить данные отгрузок');
        
        // Используем моковые данные при ошибке
        setShipments([
          { 
            id: '1', 
            date: '2024-05-01',
            animalId: '1',
            animalNumber: '0122',
            buyerId: '1',
            buyerName: 'ООО "Агрокомплекс"',
            vehicleNumber: 'А123БВ 36',
            driverName: 'Иванов И.И.',
            proxyNumber: '12345',
            releasedById: '1',
            releaserName: 'Администратор',
            acceptedBy: 'Петров П.П.',
            price: 150000,
            weight: 450,
            totalAmount: 150000,
            comments: 'Комментарий к отгрузке',
            createdAt: '2024-05-01T10:00:00Z'
          },
          { 
            id: '2', 
            date: '2024-05-02',
            animalId: '2',
            animalNumber: '0123',
            buyerId: '2',
            buyerName: 'КФХ "Заря"',
            vehicleNumber: 'В567ГД 36',
            driverName: 'Петров П.П.',
            proxyNumber: '54321',
            releasedById: '1',
            releaserName: 'Администратор',
            acceptedBy: 'Сидоров С.С.',
            price: 160000,
            weight: 470,
            totalAmount: 160000,
            comments: 'Корова на мясо',
            createdAt: '2024-05-02T11:00:00Z'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadShipments();
  }, []);

  // Функция для загрузки животных по ID отгрузки
  const loadShipmentAnimals = async (shipmentId: string): Promise<ShipmentAnimal[]> => {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('shipment_animals')
        .select('*')
        .eq('shipment_id', shipmentId);
      
      if (error) {
        console.error('Ошибка при загрузке животных отгрузки:', error.message);
        return [];
      }
      
      if (data) {
        return data.map(animal => ({
          id: animal.id,
          shipmentId: animal.shipment_id,
          animalId: animal.animal_id,
          animalNumber: animal.animal_number,
          weight: animal.weight,
          price: animal.price
        }));
      }
    } catch (err) {
      console.error('Ошибка при загрузке животных отгрузки:', err);
    }
    
    return [];
  };

  const addShipment = async (
    newShipment: Omit<Shipment, 'id' | 'createdAt' | 'animalNumber' | 'buyerName' | 'releaserName' | 'animals'>,
    animals: {animalId: string, animalNumber: string, weight?: number, price?: number}[]
  ): Promise<Shipment | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Проверка наличия текущего пользователя
      if (!currentUser) {
        setError('Пользователь не авторизован');
        return null;
      }

      if (!supabase) {
        // Если Supabase не инициализирован, добавляем локально
        const shipment: Shipment = {
          ...newShipment,
          id: String(Date.now()),
          createdAt: new Date().toISOString(),
          animals: animals.map((animal, index) => ({
            id: `${Date.now()}-${index}`,
            shipmentId: String(Date.now()),
            animalId: animal.animalId,
            animalNumber: animal.animalNumber,
            weight: animal.weight,
            price: animal.price
          })),
          // Для обратной совместимости сохраняем первое животное
          animalId: animals[0]?.animalId,
          animalNumber: animals[0]?.animalNumber,
          weight: animals[0]?.weight,
          price: animals[0]?.price,
          // Рассчитываем общую сумму
          totalAmount: animals.reduce((sum, animal) => {
            return sum + (animal.price || 0) * (animal.weight || 1);
          }, 0)
        };
        
        setShipments(prev => [...prev, shipment]);
        
        // Добавляем запись в логи
        const log: ShipmentLog = {
          id: String(Date.now() + 1),
          shipmentId: shipment.id,
          userId: currentUser.id,
          userName: currentUser.fullName,
          action: 'CREATE',
          details: `Создана отгрузка ${animals.length} животных`,
          timestamp: new Date().toISOString()
        };
        
        setShipmentLogs(prev => [...prev, log]);
        
        return shipment;
      }

      // Получаем информацию о покупателе
      let buyerName = '';
      try {
        // Исправлено: Обработка ошибки, если запрос не возвращает строки
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select('name')
          .eq('id', newShipment.buyerId);
          
        if (buyerError) {
          console.warn('Ошибка при получении имени покупателя:', buyerError);
        } else if (buyerData && buyerData.length > 0) {
          buyerName = buyerData[0].name;
        } else {
          console.warn('Покупатель не найден:', newShipment.buyerId);
          buyerName = `Покупатель #${newShipment.buyerId}`;
        }
      } catch (err) {
        console.warn('Не удалось получить имя покупателя:', err);
        buyerName = `Покупатель #${newShipment.buyerId}`;
      }
      
      // Получаем информацию о пользователе, который сделал отпуск
      let releaserName = '';
      try {
        // Исправлено: Обработка ошибки, если запрос не возвращает строки
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', newShipment.releasedById);
          
        if (userError) {
          console.warn('Ошибка при получении имени отпускающего:', userError);
        } else if (userData && userData.length > 0) {
          releaserName = userData[0].full_name;
        } else {
          console.warn('Пользователь не найден:', newShipment.releasedById);
          releaserName = `Пользователь #${newShipment.releasedById}`;
        }
      } catch (err) {
        console.warn('Не удалось получить имя отпускающего:', err);
        releaserName = `Пользователь #${newShipment.releasedById}`;
      }

      // Рассчитываем общую сумму отгрузки
      const totalAmount = animals.reduce((sum, animal) => {
        return sum + (animal.price || 0) * (animal.weight || 1);
      }, 0);

      // Убедимся, что идентификаторы имеют формат UUID
      const validBuyerId = ensureValidUuid(newShipment.buyerId);
      const validReleasedById = ensureValidUuid(newShipment.releasedById);
      
      // Сохраняем данные первого животного для обратной совместимости
      const firstAnimal = animals[0];
      const validFirstAnimalId = firstAnimal ? ensureValidUuid(firstAnimal.animalId) : null;

      // Добавление отгрузки в Supabase
      const { data, error } = await supabase
        .from('shipments')
        .insert([{
          date: newShipment.date,
          animal_id: validFirstAnimalId,
          animal_number: firstAnimal ? firstAnimal.animalNumber : null,
          buyer_id: validBuyerId,
          buyer_name: buyerName,
          vehicle_number: newShipment.vehicleNumber,
          driver_name: newShipment.driverName,
          proxy_number: newShipment.proxyNumber,
          released_by_id: validReleasedById,
          releaser_name: releaserName,
          accepted_by: newShipment.acceptedBy,
          price: firstAnimal ? firstAnimal.price : null,
          weight: firstAnimal ? firstAnimal.weight : null,
          total_amount: totalAmount,
          comments: newShipment.comments
        }])
        .select();
      
      if (error) {
        console.error('Ошибка при добавлении отгрузки:', error.message);
        setError(`Ошибка при добавлении отгрузки: ${error.message}`);
        return null;
      }
      
      if (data && data[0]) {
        const shipmentId = data[0].id;

        // Добавляем записи о животных
        for (const animal of animals) {
          const validAnimalId = ensureValidUuid(animal.animalId);
          
          const { error: animalError } = await supabase
            .from('shipment_animals')
            .insert({
              shipment_id: shipmentId,
              animal_id: validAnimalId,
              animal_number: animal.animalNumber,
              weight: animal.weight,
              price: animal.price
            });
          
          if (animalError) {
            console.error('Ошибка при добавлении животного к отгрузке:', animalError.message);
          }
        }

        const shipment: Shipment = {
          id: data[0].id,
          date: data[0].date,
          animalId: data[0].animal_id,
          animalNumber: data[0].animal_number,
          buyerId: data[0].buyer_id,
          buyerName: data[0].buyer_name,
          vehicleNumber: data[0].vehicle_number,
          driverName: data[0].driver_name,
          proxyNumber: data[0].proxy_number,
          releasedById: data[0].released_by_id,
          releaserName: data[0].releaser_name,
          acceptedBy: data[0].accepted_by,
          price: data[0].price,
          weight: data[0].weight,
          totalAmount: data[0].total_amount,
          comments: data[0].comments,
          createdAt: data[0].created_at,
          animals: animals.map((animal, index) => ({
            id: `temp-${index}`, // Временный ID, так как мы не получаем ID из базы
            shipmentId: shipmentId,
            animalId: animal.animalId,
            animalNumber: animal.animalNumber,
            weight: animal.weight,
            price: animal.price
          }))
        };
        
        setShipments(prev => [...prev, shipment]);
        
        // Добавляем запись в логи
        const validUserId = ensureValidUuid(currentUser.id);
        
        await supabase
          .from('shipment_logs')
          .insert([{
            shipment_id: shipment.id,
            user_id: validUserId,
            action: 'CREATE',
            details: `Создана отгрузка ${animals.length} животных`,
            timestamp: new Date().toISOString()
          }]);
        
        // Обновляем логи в локальном состоянии
        const newLog: ShipmentLog = {
          id: String(Date.now()), // временный ID до перезагрузки
          shipmentId: shipment.id,
          userId: currentUser?.id || '',
          userName: currentUser?.fullName || 'Неизвестный пользователь',
          action: 'CREATE',
          details: `Создана отгрузка ${animals.length} животных`,
          timestamp: new Date().toISOString()
        };
        
        setShipmentLogs(prev => [...prev, newLog]);
        
        return shipment;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при добавлении отгрузки:', err);
      setError('Не удалось добавить отгрузку');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShipment = async (id: string, reason: string): Promise<void> => {
    try {
      // Проверяем права доступа
      const isAdmin = currentUser?.role === 'ADMIN';
      const isManager = currentUser?.role === 'MANAGER';
      
      if (!isAdmin && !isManager) {
        setError('У вас нет прав на удаление отгрузок');
        return;
      }
      
      if (!reason.trim()) {
        setError('Необходимо указать причину удаления');
        return;
      }

      setIsLoading(true);
      setError(null);

      const shipmentToDelete = shipments.find(s => s.id === id);
      if (!shipmentToDelete) {
        setError('Отгрузка не найдена');
        return;
      }

      if (!supabase) {
        // Если Supabase не инициализирован, удаляем локально
        const deletedAt = new Date().toISOString();
        
        setShipments(prev => prev.map(shipment => 
          shipment.id === id 
            ? { 
                ...shipment, 
                deletedAt, 
                deletedBy: currentUser?.id, 
                deletedReason: reason 
              } 
            : shipment
        ));
        
        // Добавляем запись в логи
        const log: ShipmentLog = {
          id: String(Date.now()),
          shipmentId: id,
          userId: currentUser?.id || '',
          userName: currentUser?.fullName || 'Неизвестный пользователь',
          action: 'DELETE',
          details: `Удалена отгрузка. Причина: ${reason}`,
          timestamp: deletedAt
        };
        
        setShipmentLogs(prev => [...prev, log]);
        
        return;
      }

      // Помечаем отгрузку как удаленную в Supabase
      const deletedAt = new Date().toISOString();
      const validUserId = ensureValidUuid(currentUser?.id);
      
      const { error } = await supabase
        .from('shipments')
        .update({
          deleted_at: deletedAt,
          deleted_by: validUserId,
          deleted_reason: reason
        })
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении отгрузки:', error.message);
        setError(`Ошибка при удалении отгрузки: ${error.message}`);
        return;
      }
      
      // Добавляем запись в логи
      await supabase
        .from('shipment_logs')
        .insert([{
          shipment_id: id,
          user_id: validUserId,
          action: 'DELETE',
          details: `Удалена отгрузка. Причина: ${reason}`,
          timestamp: deletedAt
        }]);
      
      // Обновляем локальное состояние
      setShipments(prev => prev.map(shipment => 
        shipment.id === id 
          ? { 
              ...shipment, 
              deletedAt, 
              deletedBy: currentUser?.id, 
              deletedReason: reason 
            } 
          : shipment
      ));
      
      // Обновляем логи в локальном состоянии
      const newLog: ShipmentLog = {
        id: String(Date.now()), // временный ID до перезагрузки
        shipmentId: id,
        userId: currentUser?.id || '',
        userName: currentUser?.fullName || 'Неизвестный пользователь',
        action: 'DELETE',
        details: `Удалена отгрузка. Причина: ${reason}`,
        timestamp: deletedAt
      };
      
      setShipmentLogs(prev => [...prev, newLog]);
    } catch (err) {
      console.error('Ошибка при удалении отгрузки:', err);
      setError('Не удалось удалить отгрузку');
    } finally {
      setIsLoading(false);
    }
  };

  const getShipmentById = (id: string): Shipment | undefined => {
    return shipments.find(shipment => shipment.id === id);
  };

  const getShipmentLogsByShipmentId = (shipmentId: string): ShipmentLog[] => {
    return shipmentLogs.filter(log => log.shipmentId === shipmentId);
  };

  return (
    <ShipmentsContext.Provider value={{
      shipments,
      shipmentLogs,
      isLoading,
      error,
      addShipment,
      deleteShipment,
      getShipmentById,
      getShipmentLogsByShipmentId,
      loadShipmentAnimals
    }}>
      {children}
    </ShipmentsContext.Provider>
  );
};

export const useShipments = () => {
  const context = useContext(ShipmentsContext);
  if (context === undefined) {
    throw new Error('useShipments must be used within a ShipmentsProvider');
  }
  return context;
};