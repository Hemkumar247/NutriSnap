import React from 'react';

interface CalorieDonutChartProps {
  current: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export const CalorieDonutChart: React.FC<CalorieDonutChartProps> = ({
  current,
  goal,
  size = 160,
  strokeWidth = 14,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = goal > 0 ? (current / goal) * 100 : 0;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  
  const isOver = percentage > 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f5c4" />
                <stop offset="100%" stopColor="#6a3093" />
            </linearGradient>
            <linearGradient id="overGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-700"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={isOver ? 'url(#overGradient)' : 'url(#progressGradient)'}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-3xl font-bold ${isOver ? 'text-red-400' : 'text-slate-100'}`}>
          {Math.round(current)}
        </span>
        <span className="text-xs text-slate-400">/ {goal} kcal</span>
      </div>
    </div>
  );
};
