import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'MANAGER' | 'VET' | 'ZOOTECHNICIAN' | 'CARETAKER' | 'INSEMINATOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

interface UserContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  getUsersByRole: (role: UserRole) => User[];
  user?: User | null; // Для обратной совместимости
  // Новая функция для полного удаления пользователя
  hardDeleteUser: (id: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const roleAccessMap: Record<UserRole, string[]> = {
  ADMIN: ['/animals', '/vet-operations', '/monitoring', '/calvings', '/herd-movement', '/insemination', '/pregnancy-test', '/shipping', '/admin', '/reports', '/medications', '/employees', '/treatment-schemes', '/planned-operations'],
  MANAGER: ['/animals', '/vet-operations', '/monitoring', '/calvings', '/herd-movement', '/insemination', '/pregnancy-test', '/shipping', '/reports', '/medications', '/employees', '/treatment-schemes', '/planned-operations'],
  VET: ['/animals', '/vet-operations', '/monitoring', '/calvings', '/reports', '/medications', '/treatment-schemes', '/planned-operations'],
  ZOOTECHNICIAN: ['/animals', '/herd-movement', '/reports', '/employees', '/planned-operations'],
  CARETAKER: ['/calvings', '/reports'],
  INSEMINATOR: ['/animals', '/insemination', '/pregnancy-test', '/reports', '/planned-operations']
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Оптимизация: используем useCallback для предотвращения лишних рендеров
  const loadUsers = useCallback(async () => {
    try {
      if (!supabase) {
        console.log('Supabase не инициализирован, используем моковые данные');
        // Если Supabase не инициализирован, используем моковые данные
        setUsers([
          {
            id: '1',
            username: 'admin',
            fullName: 'Администратор',
            role: 'ADMIN',
            isActive: true
          },
          {
            id: '2',
            username: 'manager',
            fullName: 'Руководитель',
            role: 'MANAGER',
            isActive: true
          }
        ]);
        setIsLoading(false);
        return;
      }

      console.log('Загрузка пользователей из Supabase...');
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) {
        console.error('Ошибка загрузки пользователей:', error.message);
        // Если таблица еще не создана, используем моковые данные
        setUsers([
          {
            id: '1',
            username: 'admin',
            fullName: 'Администратор',
            role: 'ADMIN',
            isActive: true
          },
          {
            id: '2',
            username: 'manager',
            fullName: 'Руководитель',
            role: 'MANAGER',
            isActive: true
          },
          {
            id: '3',
            username: 'vet',
            fullName: 'Ветеринар',
            role: 'VET',
            isActive: true
          },
          {
            id: '4',
            username: 'caretaker',
            fullName: 'Телятница',
            role: 'CARETAKER',
            isActive: true
          },
          {
            id: '5',
            username: 'inseminator',
            fullName: 'Осеминатор',
            role: 'INSEMINATOR',
            isActive: true
          }
        ]);
      } else if (data && data.length > 0) {
        console.log('Загружено пользователей:', data.length);
        const formattedUsers: User[] = data.map(user => ({
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role as UserRole,
          isActive: user.is_active
        }));
        setUsers(formattedUsers);
      } else {
        console.warn('Не найдено пользователей, используем моковые данные');
        // Если данные пустые, используем моковые данные
        setUsers([
          {
            id: '1',
            username: 'admin',
            fullName: 'Администратор',
            role: 'ADMIN',
            isActive: true
          },
          {
            id: '2',
            username: 'manager',
            fullName: 'Руководитель',
            role: 'MANAGER',
            isActive: true
          },
          {
            id: '3',
            username: 'vet',
            fullName: 'Ветеринар',
            role: 'VET',
            isActive: true
          },
          {
            id: '4',
            username: 'caretaker',
            fullName: 'Телятница',
            role: 'CARETAKER',
            isActive: true
          },
          {
            id: '5',
            username: 'inseminator',
            fullName: 'Осеминатор',
            role: 'INSEMINATOR',
            isActive: true
          }
        ]);
      }
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      // Если таблица еще не создана, используем моковые данные
      setUsers([
        {
          id: '1',
          username: 'admin',
          fullName: 'Администратор',
          role: 'ADMIN',
          isActive: true
        },
        {
          id: '2',
          username: 'manager',
          fullName: 'Руководитель',
          role: 'MANAGER',
          isActive: true
        },
        {
          id: '3',
          username: 'vet',
          fullName: 'Ветеринар',
          role: 'VET',
          isActive: true
        },
        {
          id: '4',
          username: 'caretaker',
          fullName: 'Телятница',
          role: 'CARETAKER',
          isActive: true
        },
        {
          id: '5',
          username: 'inseminator',
          fullName: 'Осеминатор',
          role: 'INSEMINATOR',
          isActive: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    // Добавляем проверку состояния аутентификации при старте
    const checkSession = async () => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Ошибка при восстановлении сессии:', error);
          localStorage.removeItem('currentUser');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, [loadUsers]);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Для демонстрации мы используем прямую проверку для admin/admin и manager/manager
      if ((username === 'admin' && password === 'admin') || 
          (username === 'manager' && password === 'manager')) {
        
        // Находим пользователя по имени пользователя
        const user = users.find(u => u.username === username && u.isActive);
        
        if (!user) {
          throw new Error('Неверные учетные данные или пользователь заблокирован');
        }
        
        setCurrentUser(user);
        // Сохраняем пользователя в localStorage для восстановления сессии
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        throw new Error('Неверные учетные данные или пользователь заблокирован');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error('Произошла ошибка при входе');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const addUser = async (newUser: Omit<User, 'id'>) => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, добавляем только в локальный стейт
        const user = { ...newUser, id: String(Date.now()) };
        setUsers(prev => [...prev, user]);
        return;
      }

      console.log('Добавление нового пользователя:', newUser.username);
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: newUser.username,
          full_name: newUser.fullName,
          role: newUser.role,
          is_active: newUser.isActive
        }])
        .select();

      if (error) {
        console.error('Ошибка при добавлении пользователя:', error);
        throw new Error(`Ошибка при добавлении пользователя: ${error.message}`);
      }

      if (data && data[0]) {
        const addedUser: User = {
          id: data[0].id,
          username: data[0].username,
          fullName: data[0].full_name,
          role: data[0].role,
          isActive: data[0].is_active
        };
        
        // Обновляем список пользователей, добавляя нового
        setUsers(prev => [...prev, addedUser]);
      }
      
      // Перезагружаем список пользователей для обновления интерфейса
      await loadUsers();
    } catch (error) {
      console.error('Ошибка при добавлении пользователя:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id: string, updatedUser: Partial<User>) => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        // Если Supabase не инициализирован, обновляем только в локальном стейте
        setUsers(prev => prev.map(user => 
          user.id === id ? { ...user, ...updatedUser } : user
        ));
        return;
      }

      console.log('Обновление пользователя с ID:', id);
      const { error } = await supabase
        .from('users')
        .update({
          username: updatedUser.username,
          full_name: updatedUser.fullName,
          role: updatedUser.role,
          is_active: updatedUser.isActive
        })
        .eq('id', id);

      if (error) {
        console.error('Ошибка при обновлении пользователя:', error);
        throw new Error(`Ошибка при обновлении пользователя: ${error.message}`);
      }

      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, ...updatedUser } : user
      ));

      // Если обновляется текущий пользователь, обновляем его в состоянии и localStorage
      if (currentUser && currentUser.id === id) {
        const updatedCurrentUser = { ...currentUser, ...updatedUser };
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
      }
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Нельзя удалить самого себя
      if (currentUser && currentUser.id === id) {
        throw new Error('Невозможно удалить текущего пользователя');
      }
      
      if (!supabase) {
        // Если Supabase не инициализирован, удаляем только из локального стейта
        setUsers(prev => prev.filter(user => user.id !== id));
        return;
      }

      console.log('Удаление пользователя с ID:', id);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка при удалении пользователя:', error);
        throw new Error(`Ошибка при удалении пользователя: ${error.message}`);
      }

      setUsers(prev => prev.filter(user => user.id !== id));
      
      // Если удаляется текущий пользователь, выходим из системы
      if (currentUser && currentUser.id === id) {
        logout();
      }
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Новая функция для полного удаления пользователя (только для администраторов)
  const hardDeleteUser = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Проверяем, является ли текущий пользователь администратором
      if (currentUser?.role !== 'ADMIN') {
        throw new Error('Только администратор может полностью удалить пользователя');
      }
      
      // Нельзя удалить самого себя
      if (currentUser && currentUser.id === id) {
        throw new Error('Невозможно удалить текущего пользователя');
      }

      // Проверяем, не пытается ли пользователь удалить единственного администратора
      const admins = users.filter(u => u.role === 'ADMIN');
      const userToDelete = users.find(u => u.id === id);
      
      if (userToDelete?.role === 'ADMIN' && admins.length <= 1) {
        throw new Error('Невозможно удалить единственного администратора системы');
      }
      
      if (!supabase) {
        // Если Supabase не инициализирован, удаляем только из локального стейта
        setUsers(prev => prev.filter(user => user.id !== id));
        return;
      }
      
      // Проверяем связи с другими таблицами и если нужно выполняем каскадное удаление
      
      // 1. Удаляем связанные записи в action_logs
      const { error: actionLogsError } = await supabase
        .from('action_logs')
        .delete()
        .eq('user_id', id);
        
      if (actionLogsError) {
        console.warn('Ошибка при удалении связанных action_logs:', actionLogsError.message);
      }
      
      // 2. Удаляем записи в shipment_logs
      const { error: shipmentLogsError } = await supabase
        .from('shipment_logs')
        .delete()
        .eq('user_id', id);
        
      if (shipmentLogsError) {
        console.warn('Ошибка при удалении связанных shipment_logs:', shipmentLogsError.message);
      }
      
      // 3. Удаляем записи в calving_logs
      const { error: calvingLogsError } = await supabase
        .from('calving_logs')
        .delete()
        .eq('user_id', id);
        
      if (calvingLogsError) {
        console.warn('Ошибка при удалении связанных calving_logs:', calvingLogsError.message);
      }
      
      // 4. Удаляем записи в insemination_logs
      const { error: inseminationLogsError } = await supabase
        .from('insemination_logs')
        .delete()
        .eq('user_id', id);
        
      if (inseminationLogsError) {
        console.warn('Ошибка при удалении связанных insemination_logs:', inseminationLogsError.message);
      }

      // 5. Обновляем записи с foreign keys, заменяя на null
      // - Обновляем completed_steps, устанавливая executor_id в null
      const { error: completedStepsError } = await supabase
        .from('completed_steps')
        .update({ executor_id: null })
        .eq('executor_id', id);
        
      if (completedStepsError) {
        console.warn('Ошибка при обновлении completed_steps:', completedStepsError.message);
      }
      
      // - Обновляем write_offs, устанавливая executor_id в null
      const { error: writeOffsError } = await supabase
        .from('write_offs')
        .update({ executor_id: null })
        .eq('executor_id', id);
        
      if (writeOffsError) {
        console.warn('Ошибка при обновлении write_offs:', writeOffsError.message);
      }
      
      // - Обновляем treatment_schemes, устанавливая supervisor_id в null
      const { error: treatmentSchemesError } = await supabase
        .from('treatment_schemes')
        .update({ supervisor_id: null })
        .eq('supervisor_id', id);
        
      if (treatmentSchemesError) {
        console.warn('Ошибка при обновлении treatment_schemes:', treatmentSchemesError.message);
      }
      
      // - Обновляем vet_operations, устанавливая executor_id в null
      const { error: vetOperationsError } = await supabase
        .from('vet_operations')
        .update({ executor_id: null })
        .eq('executor_id', id);
        
      if (vetOperationsError) {
        console.warn('Ошибка при обновлении vet_operations:', vetOperationsError.message);
      }

      // Наконец, удаляем самого пользователя
      console.log('Полное удаление пользователя с ID:', id);
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка при полном удалении пользователя:', error);
        throw new Error(`Ошибка при полном удалении пользователя: ${error.message}`);
      }

      setUsers(prev => prev.filter(user => user.id !== id));
      
      // Если удаляется текущий пользователь, выходим из системы
      if (currentUser && currentUser.id === id) {
        logout();
      }
      
      console.log('Пользователь успешно удален из системы');
    } catch (error) {
      console.error('Ошибка при полном удалении пользователя:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Нельзя заблокировать самого себя
      if (currentUser && currentUser.id === id) {
        throw new Error('Невозможно изменить статус текущего пользователя');
      }
      
      if (!supabase) {
        // Если Supabase не инициализирован, обновляем только в локальном стейте
        setUsers(prev => prev.map(u =>
          u.id === id ? { ...u, isActive: !u.isActive } : u
        ));
        return;
      }

      console.log('Изменение статуса пользователя с ID:', id, 'на', !user.isActive);
      const { error } = await supabase
        .from('users')
        .update({ is_active: !user.isActive })
        .eq('id', id);

      if (error) {
        console.error('Ошибка при изменении статуса пользователя:', error);
        throw new Error(`Ошибка при изменении статуса пользователя: ${error.message}`);
      }

      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, isActive: !u.isActive } : u
      ));

      // Если меняется статус текущего пользователя, и он становится неактивным, выходим из системы
      if (currentUser && currentUser.id === id && user.isActive) {
        logout();
      }
      
      // Перезагружаем список пользователей для обновления интерфейса
      await loadUsers();
    } catch (error) {
      console.error('Ошибка при изменении статуса пользователя:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для получения пользователей по роли
  const getUsersByRole = (role: UserRole): User[] => {
    return users.filter(user => user.role === role && user.isActive);
  };

  // Мемоизируем объект контекста для предотвращения лишних перерисовок
  const contextValue = useMemo(() => ({
    currentUser,
    users,
    isLoading,
    login,
    logout,
    addUser,
    updateUser,
    deleteUser,
    hardDeleteUser,
    toggleUserStatus,
    getUsersByRole,
    user: currentUser // для обратной совместимости
  }), [currentUser, users, isLoading]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const useAuthorization = (path: string): boolean => {
  const { currentUser } = useUser();
  if (!currentUser) return false;
  
  const allowedPaths = roleAccessMap[currentUser.role];
  return allowedPaths.includes(path);
};

export default UserContext;