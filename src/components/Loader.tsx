import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white';
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 'md', 
  color = 'primary',
  text
}) => {
  const sizeClass = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  }[size];

  const colorClass = {
    primary: 'text-blue-600',
    white: 'text-white'
  }[color];

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full border-t-transparent ${colorClass} ${sizeClass}`}></div>
      {text && <p className={`mt-2 text-sm ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>{text}</p>}
    </div>
  );
};

export default Loader;