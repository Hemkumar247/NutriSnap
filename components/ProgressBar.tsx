import React from 'react';

interface ProgressBarProps {
  value: number;
  goal: number;
  gradient: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, goal, gradient }) => {
  const percentage = goal > 0 ? (value / goal) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100);
  const isOver = percentage > 100;

  return (
    <div className="w-full bg-slate-700 rounded-full h-1.5">
      <div 
        className={`h-1.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : `bg-gradient-to-r ${gradient}`}`}
        style={{ width: `${displayPercentage}%` }}
      ></div>
    </div>
  );
};
