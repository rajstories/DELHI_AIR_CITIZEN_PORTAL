import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
  return (
    <div className={`bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-4 border border-gray-100 ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-3">
          {title && <h3 className="text-gov-navy font-semibold text-lg">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
