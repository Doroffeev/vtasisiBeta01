import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600 text-sm">
              © 2025 ПанельУправления. Все права защищены.
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              Условия использования
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors text-sm">
              Поддержка
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;