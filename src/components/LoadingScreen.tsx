import React from 'react';
import Loader from './Loader';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Загрузка данных...' }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <Loader size="lg" color="white" />
        <p className="mt-4 text-white font-medium">{message}</p>
        <p className="mt-2 text-white text-sm opacity-70">Пожалуйста, подождите</p>
      </div>
    </div>
  );
};

export default LoadingScreen;