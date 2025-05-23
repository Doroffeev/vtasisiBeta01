import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

interface StatisticCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ 
  title, 
  value, 
  change, 
  isPositive
}) => {
  return (
    <div className="bg-white bg-opacity-10 rounded-md p-4 hover:bg-opacity-15 transition-all duration-200">
      <div className="flex justify-between">
        <p className="text-sm text-white text-opacity-80">{title}</p>
        <div className={`flex items-center ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
          {isPositive ? (
            <ArrowUp size={16} />
          ) : (
            <ArrowDown size={16} />
          )}
          <span className="text-xs ml-1">{change}</span>
        </div>
      </div>
      <p className="text-xl font-bold text-white mt-2">{value}</p>
    </div>
  );
};

export default StatisticCard;