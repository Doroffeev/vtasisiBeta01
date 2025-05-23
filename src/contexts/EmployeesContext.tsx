import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext'; // Импортируем контекст пользователя

export type EmployeeRole = 'VET' | 'INSEMINATOR' | 'CARETAKER' | 'ZOOTECHNICIAN';

export interface Employee {
  id: string;
  fullName: string;
  position: EmployeeRole;
  isActive: boolean;
}

interface EmployeesContextType {
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<Employee | null>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  toggleEmployeeStatus: (id: string) => Promise<void>;
  getEmployeeById: (id: string) => Employee | undefined;
  getActiveEmployeesByRole: (role: EmployeeRole) => Employee[];
}

const EmployeesContext = createContext<EmployeesContextType | undefined>(undefined);

export const roleLabels: Record<EmployeeRole, string> = {
  VET: 'Ветврач',
  INSEMINATOR: 'Осеминатор',
  CARETAKER: 'Телятница',
  ZOOTECHNICIAN: 'Зоотехник'
};

export const EmployeesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser(); // Получаем текущего пользователя из контекста

  // Загрузка сотрудников из Supabase
  const loadEmployees = async () => {
    try {
      if (!supabase) {
        // Если Supabase не инициализирован, используем моковые данные
        setEmployees([
          { id: '1', fullName: 'Петров Александр Иванович', position: 'VET', isActive: true },
          { id: '2', fullName: 'Иванова Мария Сергеевна', position: 'INSEMINATOR', isActive: true },
          { id: '3', fullName: 'Сидорова Анна Петровна', position: 'CARETAKER', isActive: true },
          { id: '4', fullName: 'Козлов Дмитрий Николаевич', position: 'ZOOTECHNICIAN', isActive: true }
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Ошибка при загрузке сотрудников:', error.message);
        // Используем моковые данные при ошибке
        setEmployees([
          { id: '1', fullName: 'Петров Александр Иванович', position: 'VET', isActive: true },
          { id: '2', fullName: 'Иванова Мария Сергеевна', position: 'INSEMINATOR', isActive: true },
          { id: '3', fullName: 'Сидорова Анна Петровна', position: 'CARETAKER', isActive: true },
          { id: '4', fullName: 'Козлов Дмитрий Николаевич', position: 'ZOOTECHNICIAN', isActive: true }
        ]);
      } else if (data) {
        const formattedEmployees: Employee[] = data.map(employee => ({
          id: employee.id,
          fullName: employee.full_name,
          position: employee.position as EmployeeRole,
          isActive: employee.is_active
        }));
        setEmployees(formattedEmployees);
      }
    } catch (error) {
      console.error('Ошибка при загрузке сотрудников:', error);
      // Если таблица еще не создана, используем моковые данные
      setEmployees([
        { id: '1', fullName: 'Петров Александр Иванович', position: 'VET', isActive: true },
        { id: '2', fullName: 'Иванова Мария Сергеевна', position: 'INSEMINATOR', isActive: true },
        { id: '3', fullName: 'Сидорова Анна Петровна', position: 'CARETAKER', isActive: true },
        { id: '4', fullName: 'Козлов Дмитрий Николаевич', position: 'ZOOTECHNICIAN', isActive: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const addEmployee = async (newEmployee: Omit<Employee, 'id'>) => {
    try {
      // Проверяем, имеет ли пользователь роль ADMIN или MANAGER
      const userRole = user?.role;
      const hasPermission = userRole === 'ADMIN' || userRole === 'MANAGER';
      
      if (!hasPermission) {
        console.error('Ошибка при добавлении сотрудника: Недостаточно прав. Требуется роль ADMIN или MANAGER');
        throw new Error('Недостаточно прав для добавления сотрудника. Требуется роль ADMIN или MANAGER');
      }

      if (!supabase) {
        // Если Supabase не инициализирован, добавляем только в локальный стейт
        const employee = { ...newEmployee, id: String(Date.now()) };
        setEmployees(prev => [...prev, employee]);
        return employee;
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([{
          full_name: newEmployee.fullName,
          position: newEmployee.position,
          is_active: newEmployee.isActive
        }])
        .select();

      if (error) {
        console.error('Ошибка при добавлении сотрудника:', error.message);
        throw new Error(`Ошибка при добавлении сотрудника: ${error.message}`);
      }

      if (data && data[0]) {
        const employee: Employee = {
          id: data[0].id,
          fullName: data[0].full_name,
          position: data[0].position,
          isActive: data[0].is_active
        };
        setEmployees(prev => [...prev, employee]);
        return employee;
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при добавлении сотрудника:', error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, updatedEmployee: Partial<Employee>) => {
    try {
      // Проверяем, имеет ли пользователь роль ADMIN или MANAGER
      const userRole = user?.role;
      const hasPermission = userRole === 'ADMIN' || userRole === 'MANAGER';
      
      if (!hasPermission) {
        console.error('Ошибка при обновлении сотрудника: Недостаточно прав. Требуется роль ADMIN или MANAGER');
        throw new Error('Недостаточно прав для обновления сотрудника. Требуется роль ADMIN или MANAGER');
      }

      if (!supabase) {
        setEmployees(prev => prev.map(employee => 
          employee.id === id ? { ...employee, ...updatedEmployee } : employee
        ));
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({
          full_name: updatedEmployee.fullName,
          position: updatedEmployee.position,
          is_active: updatedEmployee.isActive
        })
        .eq('id', id);

      if (error) {
        console.error('Ошибка при обновлении сотрудника:', error.message);
        throw new Error(`Ошибка при обновлении сотрудника: ${error.message}`);
      }

      setEmployees(prev => prev.map(employee => 
        employee.id === id ? { ...employee, ...updatedEmployee } : employee
      ));
    } catch (error) {
      console.error('Ошибка при обновлении сотрудника:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      // Проверяем, имеет ли пользователь роль ADMIN или MANAGER
      const userRole = user?.role;
      const hasPermission = userRole === 'ADMIN' || userRole === 'MANAGER';
      
      if (!hasPermission) {
        console.error('Ошибка при удалении сотрудника: Недостаточно прав. Требуется роль ADMIN или MANAGER');
        throw new Error('Недостаточно прав для удаления сотрудника. Требуется роль ADMIN или MANAGER');
      }

      if (!supabase) {
        setEmployees(prev => prev.filter(employee => employee.id !== id));
        return;
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Ошибка при удалении сотрудника:', error.message);
        throw new Error(`Ошибка при удалении сотрудника: ${error.message}`);
      }

      setEmployees(prev => prev.filter(employee => employee.id !== id));
    } catch (error) {
      console.error('Ошибка при удалении сотрудника:', error);
      throw error;
    }
  };

  const toggleEmployeeStatus = async (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (!employee) return;

    try {
      // Проверяем, имеет ли пользователь роль ADMIN или MANAGER
      const userRole = user?.role;
      const hasPermission = userRole === 'ADMIN' || userRole === 'MANAGER';
      
      if (!hasPermission) {
        console.error('Ошибка при изменении статуса сотрудника: Недостаточно прав. Требуется роль ADMIN или MANAGER');
        throw new Error('Недостаточно прав для изменения статуса сотрудника. Требуется роль ADMIN или MANAGER');
      }

      if (!supabase) {
        setEmployees(prev => prev.map(employee =>
          employee.id === id ? { ...employee, isActive: !employee.isActive } : employee
        ));
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({ is_active: !employee.isActive })
        .eq('id', id);

      if (error) {
        console.error('Ошибка при изменении статуса сотрудника:', error.message);
        throw new Error(`Ошибка при изменении статуса сотрудника: ${error.message}`);
      }

      setEmployees(prev => prev.map(employee =>
        employee.id === id ? { ...employee, isActive: !employee.isActive } : employee
      ));
    } catch (error) {
      console.error('Ошибка при изменении статуса сотрудника:', error);
      throw error;
    }
  };

  const getEmployeeById = (id: string) => {
    return employees.find(employee => employee.id === id);
  };

  const getActiveEmployeesByRole = (role: EmployeeRole) => {
    return employees.filter(employee => employee.position === role && employee.isActive);
  };

  return (
    <EmployeesContext.Provider value={{
      employees,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      toggleEmployeeStatus,
      getEmployeeById,
      getActiveEmployeesByRole
    }}>
      {children}
    </EmployeesContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeesContext);
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeesProvider');
  }
  return context;
};