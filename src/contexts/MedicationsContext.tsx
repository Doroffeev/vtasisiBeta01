import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

export interface Medication {
  id: string;
  nomenclatureId: string;
  quantity: number;
  unitPrice: number;
  invoiceNumber: string;
  remainingQuantity: number;
  receiptDate: string;
  expiryDate: string;
  batchNumber: string;
  supplier?: string;
  createdAt?: string;
}

export interface WriteOff {
  id: string;
  date: string;
  medicationId: string;
  quantity: number;
  reason: string;
  executorId: string;
  createdAt?: string;
}

interface MedicationsContextType {
  medications: Medication[];
  writeOffs: WriteOff[];
  isLoading: boolean;
  error: string | null;
  addMedication: (medication: Omit<Medication, 'id' | 'remainingQuantity'>) => Promise<Medication | null>;
  updateMedicationQuantity: (medicationId: string, quantity: number) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;
  getMedicationById: (id: string) => Medication | undefined;
  getMedicationsByNomenclature: (nomenclatureId: string) => Medication[];
  writeOffMedication: (writeOff: Omit<WriteOff, 'id' | 'date'>) => Promise<void>;
}

const MedicationsContext = createContext<MedicationsContextType | undefined>(undefined);

export function MedicationsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useUser();

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!supabase) {
        // Если Supabase не инициализирован, используем моковые данные
        setMedications([
          {
            id: '1',
            nomenclatureId: '1',
            quantity: 1000,
            unitPrice: 150,
            invoiceNumber: 'INV-001',
            remainingQuantity: 850,
            receiptDate: '2024-03-01',
            expiryDate: '2025-03-01',
            batchNumber: 'BATCH-001'
          },
          {
            id: '2',
            nomenclatureId: '2',
            quantity: 50,
            unitPrice: 300,
            invoiceNumber: 'INV-002',
            remainingQuantity: 42,
            receiptDate: '2024-03-15',
            expiryDate: '2025-03-15',
            batchNumber: 'BATCH-002'
          }
        ]);
        
        setWriteOffs([]);
        setIsLoading(false);
        return;
      }

      // Загрузка препаратов из Supabase
      const { data: medicationsData, error: medicationsError } = await supabase
        .from('medications')
        .select('*')
        .order('receipt_date', { ascending: false });
      
      if (medicationsError) {
        console.error('Ошибка при загрузке препаратов:', medicationsError.message);
        setError(`Ошибка при загрузке препаратов: ${medicationsError.message}`);
        // Используем моковые данные при ошибке
        setMedications([
          {
            id: '1',
            nomenclatureId: '1',
            quantity: 1000,
            unitPrice: 150,
            invoiceNumber: 'INV-001',
            remainingQuantity: 850,
            receiptDate: '2024-03-01',
            expiryDate: '2025-03-01',
            batchNumber: 'BATCH-001'
          },
          {
            id: '2',
            nomenclatureId: '2',
            quantity: 50,
            unitPrice: 300,
            invoiceNumber: 'INV-002',
            remainingQuantity: 42,
            receiptDate: '2024-03-15',
            expiryDate: '2025-03-15',
            batchNumber: 'BATCH-002'
          }
        ]);
      } else if (medicationsData) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedMedications: Medication[] = medicationsData.map(med => ({
          id: med.id,
          nomenclatureId: med.nomenclature_id,
          quantity: med.quantity,
          unitPrice: med.unit_price,
          invoiceNumber: med.invoice_number,
          remainingQuantity: med.remaining_quantity,
          receiptDate: med.receipt_date,
          expiryDate: med.expiry_date,
          batchNumber: med.batch_number,
          supplier: med.supplier,
          createdAt: med.created_at
        }));
        
        setMedications(formattedMedications);
      }

      // Загрузка списаний из Supabase
      const { data: writeOffsData, error: writeOffsError } = await supabase
        .from('write_offs')
        .select('*')
        .order('date', { ascending: false });
      
      if (writeOffsError) {
        console.error('Ошибка при загрузке списаний:', writeOffsError.message);
      } else if (writeOffsData) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedWriteOffs: WriteOff[] = writeOffsData.map(wo => ({
          id: wo.id,
          date: wo.date,
          medicationId: wo.medication_id,
          quantity: wo.quantity,
          reason: wo.reason,
          executorId: wo.executor_id,
          createdAt: wo.created_at
        }));
        
        setWriteOffs(formattedWriteOffs);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      // Используем моковые данные при ошибке
      setMedications([
        {
          id: '1',
          nomenclatureId: '1',
          quantity: 1000,
          unitPrice: 150,
          invoiceNumber: 'INV-001',
          remainingQuantity: 850,
          receiptDate: '2024-03-01',
          expiryDate: '2025-03-01',
          batchNumber: 'BATCH-001'
        },
        {
          id: '2',
          nomenclatureId: '2',
          quantity: 50,
          unitPrice: 300,
          invoiceNumber: 'INV-002',
          remainingQuantity: 42,
          receiptDate: '2024-03-15',
          expiryDate: '2025-03-15',
          batchNumber: 'BATCH-002'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const addMedication = async (newMedication: Omit<Medication, 'id' | 'remainingQuantity'>): Promise<Medication | null> => {
    try {
      setIsLoading(true);
      
      // В любом случае создаем объект с полной информацией о препарате
      const medication: Medication = {
        ...newMedication,
        id: String(Date.now()),
        remainingQuantity: newMedication.quantity
      };
      
      if (!supabase) {
        // Если Supabase не инициализирован, добавляем только в локальный стейт
        setMedications(prev => [...prev, medication]);
        return medication;
      }

      // Добавление препарата в Supabase
      const { data, error } = await supabase
        .from('medications')
        .insert([{
          nomenclature_id: newMedication.nomenclatureId,
          quantity: newMedication.quantity,
          unit_price: newMedication.unitPrice,
          invoice_number: newMedication.invoiceNumber,
          remaining_quantity: newMedication.quantity,
          receipt_date: newMedication.receiptDate,
          expiry_date: newMedication.expiryDate,
          batch_number: newMedication.batchNumber,
          supplier: newMedication.supplier
        }])
        .select();

      if (error) {
        console.error('Ошибка при добавлении препарата:', error.message);
        setError(`Ошибка при добавлении препарата: ${error.message}`);
        return null;
      }

      if (data && data[0]) {
        const insertedMedication: Medication = {
          id: data[0].id,
          nomenclatureId: data[0].nomenclature_id,
          quantity: data[0].quantity,
          unitPrice: data[0].unit_price,
          invoiceNumber: data[0].invoice_number,
          remainingQuantity: data[0].remaining_quantity,
          receiptDate: data[0].receipt_date,
          expiryDate: data[0].expiry_date,
          batchNumber: data[0].batch_number,
          supplier: data[0].supplier,
          createdAt: data[0].created_at
        };
        
        setMedications(prev => [...prev, insertedMedication]);
        return insertedMedication;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при добавлении препарата:', error);
      setError('Не удалось добавить препарат');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMedicationQuantity = async (medicationId: string, quantity: number): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Находим препарат в локальном состоянии
      const medication = medications.find(med => med.id === medicationId);
      if (!medication) {
        throw new Error('Препарат не найден');
      }

      // Проверяем, что оставшееся количество больше или равно списываемому
      if (medication.remainingQuantity < quantity) {
        throw new Error(`Недостаточное количество препарата: осталось ${medication.remainingQuantity}, требуется списать ${quantity}`);
      }

      // Рассчитываем новое оставшееся количество
      const newRemainingQuantity = medication.remainingQuantity - quantity;

      // Обновляем локальное состояние
      setMedications(prev => 
        prev.map(med => 
          med.id === medicationId 
            ? { ...med, remainingQuantity: newRemainingQuantity } 
            : med
        )
      );

      if (supabase) {
        // Обновляем количество в Supabase
        const { error } = await supabase
          .from('medications')
          .update({ remaining_quantity: newRemainingQuantity })
          .eq('id', medicationId);
        
        if (error) {
          console.error('Ошибка при обновлении количества препарата:', error.message);
          throw new Error(`Ошибка при обновлении количества препарата: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Ошибка при обновлении количества препарата:', error);
      setError(error.message || 'Не удалось обновить количество препарата');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для удаления препарата (только для администратора)
  const deleteMedication = async (medicationId: string): Promise<void> => {
    try {
      // Проверяем, имеет ли текущий пользователь роль администратора
      if (currentUser?.role !== 'ADMIN') {
        throw new Error('Недостаточно прав. Только администратор может удалять препараты');
      }
      
      setIsLoading(true);
      setError(null);

      // Находим препарат в локальном состоянии
      const medication = medications.find(med => med.id === medicationId);
      if (!medication) {
        throw new Error('Препарат не найден');
      }

      // Проверяем, что остаток препарата равен 0
      if (medication.remainingQuantity > 0) {
        throw new Error('Нельзя удалить препарат с ненулевым остатком. Остаток должен быть 0');
      }

      if (supabase) {
        // Сначала удаляем связанные записи списаний из write_offs
        const { error: writeOffsError } = await supabase
          .from('write_offs')
          .delete()
          .eq('medication_id', medicationId);
          
        if (writeOffsError) {
          console.error('Ошибка при удалении связанных списаний:', writeOffsError.message);
          throw new Error(`Ошибка при удалении связанных списаний: ${writeOffsError.message}`);
        }
        
        // После удаления списаний удаляем сам препарат
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', medicationId);
        
        if (error) {
          console.error('Ошибка при удалении препарата:', error.message);
          throw new Error(`Ошибка при удалении препарата: ${error.message}`);
        }

        // Проверяем существование пользователя перед добавлением записи в журнал
        const userId = currentUser?.id;
        if (userId) {
          const userExists = await checkUserExists(userId);
          if (userExists) {
            // Добавляем запись в журнал действий только если пользователь существует
            await supabase
              .from('action_logs')
              .insert([{
                user_id: userId,
                action_type: 'DELETE_MEDICATION',
                entity_id: medicationId,
                details: `Удален препарат с ID: ${medicationId}`,
                created_at: new Date().toISOString()
              }]);
          } else {
            console.warn(`Пользователь с ID ${userId} не найден в базе данных. Запись в журнал не добавлена.`);
          }
        } else {
          console.warn('ID пользователя не определен. Запись в журнал не добавлена.');
        }
      }

      // Обновляем локальное состояние, удаляя препарат и связанные списания
      setMedications(prev => prev.filter(med => med.id !== medicationId));
      setWriteOffs(prev => prev.filter(wo => wo.medicationId !== medicationId));
      
    } catch (error) {
      console.error('Ошибка при удалении препарата:', error);
      setError(error.message || 'Не удалось удалить препарат');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const writeOffMedication = async (writeOffData: Omit<WriteOff, 'id' | 'date'>): Promise<void> => {
    try {
      setIsLoading(true);

      // Проверяем, что указанное количество для списания доступно
      const medication = medications.find(med => med.id === writeOffData.medicationId);
      if (!medication || medication.remainingQuantity < writeOffData.quantity) {
        throw new Error('Недостаточное количество препарата для списания');
      }

      // Создаем новую запись о списании
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const writeOff: WriteOff = {
        ...writeOffData,
        id: String(Date.now()),
        date: currentDate
      };

      if (supabase) {
        // Создаем транзакцию для списания препарата
        // 1. Обновляем оставшееся количество
        const { error: updateError } = await supabase
          .from('medications')
          .update({
            remaining_quantity: medication.remainingQuantity - writeOffData.quantity
          })
          .eq('id', writeOffData.medicationId);

        if (updateError) {
          console.error('Ошибка при обновлении остатка препарата:', updateError.message);
          throw new Error(`Ошибка при обновлении остатка препарата: ${updateError.message}`);
        }

        // 2. Добавляем запись списания
        const { error: insertError } = await supabase
          .from('write_offs')
          .insert([{
            date: currentDate,
            medication_id: writeOffData.medicationId,
            quantity: writeOffData.quantity,
            reason: writeOffData.reason,
            executor_id: writeOffData.executorId
          }]);

        if (insertError) {
          console.error('Ошибка при добавлении записи списания:', insertError.message);
          throw new Error(`Ошибка при добавлении записи списания: ${insertError.message}`);
        }

        // Проверяем существование пользователя перед добавлением записи в журнал
        const userId = currentUser?.id;
        if (userId) {
          const userExists = await checkUserExists(userId);
          if (userExists) {
            // Добавляем запись в журнал действий только если пользователь существует
            await supabase
              .from('action_logs')
              .insert([{
                user_id: userId,
                action_type: 'WRITE_OFF_MEDICATION',
                entity_id: writeOffData.medicationId,
                details: `Списан препарат: ${writeOffData.quantity} ед. Причина: ${writeOffData.reason}`,
                created_at: new Date().toISOString()
              }]);
          } else {
            console.warn(`Пользователь с ID ${userId} не найден в базе данных. Запись в журнал не добавлена.`);
          }
        } else {
          console.warn('ID пользователя не определен. Запись в журнал не добавлена.');
        }
      }

      // Обновляем локальное состояние
      setMedications(prev => 
        prev.map(med => 
          med.id === writeOffData.medicationId
            ? { ...med, remainingQuantity: med.remainingQuantity - writeOffData.quantity }
            : med
        )
      );
      
      // Добавляем запись списания в локальное состояние
      setWriteOffs(prev => [...prev, writeOff]);
    } catch (error) {
      console.error('Ошибка при списании препарата:', error);
      setError(error.message || 'Не удалось списать препарат');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getMedicationById = (id: string) => {
    return medications.find(med => med.id === id);
  };

  const getMedicationsByNomenclature = (nomenclatureId: string) => {
    return medications.filter(med => med.nomenclatureId === nomenclatureId);
  };

  return (
    <MedicationsContext.Provider value={{ 
      medications, 
      writeOffs,
      isLoading,
      error,
      addMedication,
      updateMedicationQuantity,
      deleteMedication,
      getMedicationById,
      getMedicationsByNomenclature,
      writeOffMedication
    }}>
      {children}
    </MedicationsContext.Provider>
  );
}

export function useMedications() {
  const context = useContext(MedicationsContext);
  if (context === undefined) {
    throw new Error('useMedications must be used within a MedicationsProvider');
  }
  return context;
}