import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // При изменении маршрута закрываем боковую панель на мобильных устройствах
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Оптимизированная функция переключения сайдбара
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prevState => !prevState);
  }, []);

  // Оптимизированная функция закрытия сайдбара при клике вне его
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    // Проверяем только если сайдбар открыт и ширина экрана меньше 1024px
    if (sidebarOpen && window.innerWidth < 1024) {
      const sidebarElement = document.getElementById('sidebar');
      const headerMenuButton = document.getElementById('header-menu-button');
      
      if (sidebarElement && 
          !sidebarElement.contains(e.target as Node) && 
          headerMenuButton && 
          !headerMenuButton.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
    }
  }, [sidebarOpen]);

  // Добавляем и удаляем обработчик события при монтировании/размонтировании компонента
  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <main className="lg:pl-64 pt-16 transition-all duration-300">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;