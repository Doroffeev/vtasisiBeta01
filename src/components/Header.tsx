import React from 'react';
import { Menu, Bell, Search, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              id="header-menu-button"
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Открыть меню"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex-1 px-4 flex justify-center lg:justify-end">
            <div className="max-w-lg w-full lg:max-w-xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Поиск..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 shadow-sm">
                  <User size={16} className="text-blue-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-700 font-medium">{currentUser?.fullName}</span>
                  <p className="text-xs text-gray-500">
                  {currentUser?.role === 'ADMIN' ? 'Администратор' : 
                    currentUser?.role === 'MANAGER' ? 'Руководитель' : 
                    currentUser?.role === 'VET' ? 'Ветврач' : 
                    currentUser?.role === 'ZOOTECHNICIAN' ? 'Зоотехник' :
                    currentUser?.role === 'CARETAKER' ? 'Телятница' :
                    'Осеминатор'
                  }
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Выйти"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;