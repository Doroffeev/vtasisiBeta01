import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Cog as Cow, Stethoscope, Calendar, X, Move, Heart, UserCog, FileText, Package, Users, ClipboardList, TruckIcon, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { useUser, useAuthorization } from '../contexts/UserContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const { currentUser } = useUser();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/animals', icon: Cow, label: 'Животные' },
    { path: '/calvings', icon: Calendar, label: 'Отёлы' },
    { path: '/insemination', icon: Heart, label: 'Осеменение' },
    { path: '/pregnancy-test', icon: CheckSquare, label: 'Тест стельности' },
    { path: '/planned-operations', icon: CalendarIcon, label: 'Плановые операции' },
    { path: '/vet-operations', icon: Stethoscope, label: 'Ветоперации' },
    { path: '/treatment-schemes', icon: ClipboardList, label: 'Схемы лечения' },
    { path: '/medications', icon: Package, label: 'Ветпрепараты' },
    { path: '/herd-movement', icon: Move, label: 'Движение поголовья' },
    { path: '/shipping', icon: TruckIcon, label: 'Отгрузка животных' },
    { path: '/reports', icon: FileText, label: 'Отчеты' },
    { path: '/admin', icon: UserCog, label: 'Администрирование' }
  ].filter(item => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return useAuthorization(item.path);
  });

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleSidebar}
      />
      
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Ветеринарный ассистент</h2>
            <p className="text-sm text-gray-600">СПК "Большевик"</p>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Разработчик: Дорофеев И. В.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;