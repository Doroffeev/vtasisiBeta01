import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
// Удаляем импорт контекста пользователя, так как он больше не нужен

export interface Group {
  id: string;
  number: string;
  // Поле description удалено
}

interface GroupsContextType {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  addGroup: (group: Omit<Group, 'id'>) => Promise<Group | undefined>;
  updateGroup: (id: string, group: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  getGroupById: (id: string) => Group | undefined;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export const GroupsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Удаляем получение данных о пользователе
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка групп при инициализации
  useEffect(() => {
    const loadGroups = async () => {
      if (!supabase) {
        setGroups([
          { id: '1', number: '1' },
          { id: '2', number: '2' },
          { id: '3', number: '3' }
        ]);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .order('number');
        
        if (error) {
          console.error('Ошибка при загрузке групп:', error.message);
          setError(`Ошибка при загрузке групп: ${error.message}`);
          // Используем моки если не удалось загрузить группы
          setGroups([
            { id: '1', number: '1' },
            { id: '2', number: '2' },
            { id: '3', number: '3' }
          ]);
        } else if (data) {
          const formattedGroups = data.map(group => ({
            id: group.id,
            number: group.number
            // Удалено поле description
          }));
          setGroups(formattedGroups);
        }
      } catch (err) {
        console.error('Ошибка при загрузке групп:', err);
        setError('Не удалось загрузить группы');
        // Используем моки если не удалось загрузить группы
        setGroups([
          { id: '1', number: '1' },
          { id: '2', number: '2' },
          { id: '3', number: '3' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGroups();
  }, []);

  const addGroup = async (newGroup: Omit<Group, 'id'>) => {
    // Удаляем проверку прав доступа пользователя

    if (!supabase) {
      const group = { ...newGroup, id: String(Date.now()) };
      setGroups(prev => [...prev, group]);
      return group;
    }

    try {
      setIsLoading(true);
      console.log('Добавление новой группы:', newGroup);
      
      const { data, error } = await supabase
        .from('groups')
        .insert([newGroup])
        .select();
      
      if (error) {
        console.error('Ошибка при добавлении группы:', error.message);
        setError(`Ошибка при добавлении группы: ${error.message}`);
        throw error;
      }
      
      if (data && data.length > 0) {
        const formattedGroup = {
          id: data[0].id,
          number: data[0].number
          // Удалено поле description
        };
        setGroups(prev => [...prev, formattedGroup]);
        return formattedGroup;
      }
    } catch (err) {
      console.error('Ошибка при добавлении группы:', err);
      setError('Не удалось добавить группу');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateGroup = async (id: string, updatedGroup: Partial<Group>) => {
    // Удаляем проверку прав доступа пользователя

    if (!supabase) {
      setGroups(prev => prev.map(group => 
        group.id === id ? { ...group, ...updatedGroup } : group
      ));
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('groups')
        .update(updatedGroup)
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при обновлении группы:', error.message);
        setError(`Ошибка при обновлении группы: ${error.message}`);
        throw error;
      }
      
      setGroups(prev => prev.map(group => 
        group.id === id ? { ...group, ...updatedGroup } : group
      ));
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      setError('Не удалось обновить группу');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGroup = async (id: string) => {
    // Удаляем проверку прав доступа пользователя

    if (!supabase) {
      setGroups(prev => prev.filter(group => group.id !== id));
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Ошибка при удалении группы:', error.message);
        setError(`Ошибка при удалении группы: ${error.message}`);
        throw error;
      }
      
      setGroups(prev => prev.filter(group => group.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      setError('Не удалось удалить группу');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getGroupById = (id: string) => {
    return groups.find(group => group.id === id);
  };

  return (
    <GroupsContext.Provider value={{ 
      groups, 
      isLoading,
      error,
      addGroup, 
      updateGroup, 
      deleteGroup, 
      getGroupById 
    }}>
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroups = () => {
  const context = useContext(GroupsContext);
  if (context === undefined) {
    throw new Error('useGroups must be used within a GroupsProvider');
  }
  return context;
};