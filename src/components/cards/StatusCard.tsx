import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatusCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ReactNode;
  bgColor: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ 
  title, 
  value, 
  change, 
  isPositive, 
  icon,
  bgColor
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 transition-transform duration-300 hover:scale-105">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-md`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? (
            <ArrowUp size={16} />
          ) : (
            <ArrowDown size={16} />
          )}
          <span className="text-sm font-medium ml-1">{change}</span>
        </div>
        <span className="text-gray-500 text-sm ml-2">За месяц</span>
      </div>
    </div>
  );
};

export default StatusCard;