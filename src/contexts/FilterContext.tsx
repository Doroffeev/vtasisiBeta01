import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  showDeleted: boolean;
  toggleShowDeleted: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showDeleted, setShowDeleted] = useState(false);

  const toggleShowDeleted = () => {
    setShowDeleted(prev => !prev);
    
    // Сохраняем настройку в localStorage для сохранения между сессиями
    localStorage.setItem('showDeletedItems', (!showDeleted).toString());
  };

  // При инициализации проверяем сохраненное значение в localStorage
  React.useEffect(() => {
    const savedPreference = localStorage.getItem('showDeletedItems');
    if (savedPreference) {
      setShowDeleted(savedPreference === 'true');
    }
  }, []);

  return (
    <FilterContext.Provider value={{ showDeleted, toggleShowDeleted }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};