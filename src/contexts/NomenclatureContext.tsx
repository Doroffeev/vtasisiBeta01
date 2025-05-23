import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NomenclatureItem {
  id: string;
  code: string;
  name: string;
  unit: 'шт' | 'мл' | 'гр';
  category: 'АНТИБИОТИК' | 'ВАКЦИНА' | 'ВИТАМИН' | 'ДРУГОЕ';
  createdAt?: string;
}

interface NomenclatureContextType {
  items: NomenclatureItem[];
  isLoading: boolean;
  error: string | null;
  addItem: (item: Omit<NomenclatureItem, 'id'>) => Promise<NomenclatureItem | null>;
  updateItem: (id: string, item: Partial<NomenclatureItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemById: (id: string) => NomenclatureItem | undefined;
}

const NomenclatureContext = createContext<NomenclatureContextType | undefined>(undefined);

export const categoryLabels: Record<NomenclatureItem['category'], string> = {
  'АНТИБИОТИК': 'Антибиотики',
  'ВАКЦИНА': 'Вакцины',
  'ВИТАМИН': 'Витамины',
  'ДРУГОЕ': 'Прочее'
};

export const NomenclatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<NomenclatureItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!supabase) {
        // Если Supabase не инициализирован, используем моковые данные
        setItems([
          { 
            id: '1', 
            code: 'АНТ-001', 
            name: 'Пенициллин', 
            unit: 'мл',
            category: 'АНТИБИОТИК'
          },
          { 
            id: '2', 
            code: 'ВАК-001', 
            name: 'Вакцина против ящура', 
            unit: 'мл',
            category: 'ВАКЦИНА'
          }
        ]);
        
        setIsLoading(false);
        return;
      }

      // Загрузка номенклатуры из Supabase
      const { data, error } = await supabase
        .from('nomenclature')
        .select('*')
        .order('code', { ascending: true });
      
      if (error) {
        console.error('Ошибка при загрузке номенклатуры:', error.message);
        setError(`Ошибка при загрузке номенклатуры: ${error.message}`);
        // Используем моковые данные при ошибке
        setItems([
          { 
            id: '1', 
            code: 'АНТ-001', 
            name: 'Пенициллин', 
            unit: 'мл',
            category: 'АНТИБИОТИК'
          },
          { 
            id: '2', 
            code: 'ВАК-001', 
            name: 'Вакцина против ящура', 
            unit: 'мл',
            category: 'ВАКЦИНА'
          }
        ]);
      } else if (data) {
        // Преобразуем данные из БД в формат нашего интерфейса
        const formattedItems: NomenclatureItem[] = data.map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          unit: item.unit,
          category: item.category,
          createdAt: item.created_at
        }));
        
        setItems(formattedItems);
      }
    } catch (err) {
      console.error('Ошибка при загрузке номенклатуры:', err);
      setError('Не удалось загрузить номенклатуру');
      // Используем моковые данные при ошибке
      setItems([
        { 
          id: '1', 
          code: 'АНТ-001', 
          name: 'Пенициллин', 
          unit: 'мл',
          category: 'АНТИБИОТИК'
        },
        { 
          id: '2', 
          code: 'ВАК-001', 
          name: 'Вакцина против ящура', 
          unit: 'мл',
          category: 'ВАКЦИНА'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (newItem: Omit<NomenclatureItem, 'id'>): Promise<NomenclatureItem | null> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, добавляем только в локальный стейт
        const item = { ...newItem, id: String(Date.now()) };
        setItems(prev => [...prev, item]);
        return item;
      }

      // Добавление номенклатуры в Supabase
      const { data, error } = await supabase
        .from('nomenclature')
        .insert([newItem])
        .select();

      if (error) {
        console.error('Ошибка при добавлении номенклатуры:', error.message);
        setError(`Ошибка при добавлении номенклатуры: ${error.message}`);
        return null;
      }

      if (data && data[0]) {
        const item: NomenclatureItem = {
          id: data[0].id,
          code: data[0].code,
          name: data[0].name,
          unit: data[0].unit,
          category: data[0].category,
          createdAt: data[0].created_at
        };
        
        setItems(prev => [...prev, item]);
        return item;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при добавлении номенклатуры:', err);
      setError('Не удалось добавить номенклатуру');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (id: string, updatedItem: Partial<NomenclatureItem>): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, обновляем только в локальном стейте
        setItems(prev => prev.map(item => 
          item.id === id ? { ...item, ...updatedItem } : item
        ));
        return;
      }

      // Обновление номенклатуры в Supabase
      const { error } = await supabase
        .from('nomenclature')
        .update(updatedItem)
        .eq('id', id);

      if (error) {
        console.error('Ошибка при обновлении номенклатуры:', error.message);
        setError(`Ошибка при обновлении номенклатуры: ${error.message}`);
        return;
      }

      // Обновляем локальный стейт
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      ));
    } catch (err) {
      console.error('Ошибка при обновлении номенклатуры:', err);
      setError('Не удалось обновить номенклатуру');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, удаляем только из локального стейта
        setItems(prev => prev.filter(item => item.id !== id));
        return;
      }

      // Удаление номенклатуры из Supabase
      const { error } = await supabase
        .from('nomenclature')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка при удалении номенклатуры:', error.message);
        setError(`Ошибка при удалении номенклатуры: ${error.message}`);
        return;
      }

      // Обновляем локальный стейт
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении номенклатуры:', err);
      setError('Не удалось удалить номенклатуру');
    } finally {
      setIsLoading(false);
    }
  };

  const getItemById = (id: string) => {
    return items.find(item => item.id === id);
  };

  return (
    <NomenclatureContext.Provider value={{
      items,
      isLoading,
      error,
      addItem,
      updateItem,
      deleteItem,
      getItemById
    }}>
      {children}
    </NomenclatureContext.Provider>
  );
};

export const useNomenclature = () => {
  const context = useContext(NomenclatureContext);
  if (context === undefined) {
    throw new Error('useNomenclature must be used within a NomenclatureProvider');
  }
  return context;
};