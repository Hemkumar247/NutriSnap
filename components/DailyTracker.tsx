import React from 'react';
import type { DailyLogItem, NutritionInfo } from '../types';
import { PencilIcon, ProteinIcon, CarbIcon, FatIcon, AddIcon, FoodIcon } from './IconComponents';
import { Goals } from './Goals';
import { ProgressBar } from './ProgressBar';
import { DietModeSelector } from './DietModeSelector';
import { CalorieDonutChart } from './CalorieDonutChart';
import { WaterTracker } from './WaterTracker';

type DietMode = 'maintenance' | 'loss' | 'gain';

interface DailyTrackerProps {
  dailyLog: DailyLogItem[];
  totals: NutritionInfo;
  goals: NutritionInfo;
  onEdit: (item: DailyLogItem) => void;
  onViewDetails: (item: DailyLogItem) => void;
  onUpdateGoals: (newGoals: NutritionInfo) => void;
  dietMode: DietMode;
  onDietModeChange: (mode: DietMode) => void;
  onAddMealClick: () => void;
  waterIntake: number;
  waterGoal: number;
  onLogWater: (amount: number) => void;
  onUpdateWaterGoal: (newGoal: number) => void;
}

// FIX: The 'icon' prop type was too generic. Making it specific to SVG props
// allows cloning with className without TypeScript errors.
const ProgressStat: React.FC<{
  label: string;
  current: number;
  goal: number;
  unit: string;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  gradient: string;
}> = ({ label, current, goal, unit, icon, gradient }) => (
  <div>
    <div className="flex justify-between items-center text-sm mb-1.5">
        <span className="font-semibold text-slate-300 flex items-center">
            {/* FIX: Merged existing icon className with new classes to prevent style override and fix type error. */}
            {React.cloneElement(icon, { className: `${icon.props.className || ''} w-4 h-4 mr-2` })}
            {label}
        </span>
        <span className="font-bold text-slate-100">
            {Math.round(current)} / {goal}{unit}
        </span>
    </div>
    <ProgressBar value={current} goal={goal} gradient={gradient} />
  </div>
);


export const DailyTracker: React.FC<DailyTrackerProps> = ({ 
  dailyLog, 
  totals, 
  goals, 
  onEdit, 
  onViewDetails,
  onUpdateGoals, 
  dietMode, 
  onDietModeChange, 
  onAddMealClick,
  waterIntake,
  waterGoal,
  onLogWater,
  onUpdateWaterGoal
}) => {
  return (
    <div className="corner-box sticky top-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <h3 className="text-2xl font-bold text-slate-200 mb-4 border-b border-cyan-300/20 pb-3">Today's Intake</h3>
      
      <div className="my-6 flex justify-center">
        <CalorieDonutChart current={totals.calories} goal={goals.calories} />
      </div>

      <DietModeSelector currentMode={dietMode} onModeChange={onDietModeChange} />
      
      <Goals goals={goals} onSave={onUpdateGoals} />

      <WaterTracker 
        current={waterIntake}
        goal={waterGoal}
        onLog={onLogWater}
        onUpdateGoal={onUpdateWaterGoal}
      />

      <div className="my-6">
        <h4 className="font-bold text-lg text-slate-200 mb-3">Macros Breakdown</h4>
        <div className="space-y-3">
          <ProgressStat label="Protein" current={totals.protein} goal={goals.protein} unit="g" icon={<ProteinIcon className="text-pink-400" />} gradient="from-purple-500 to-pink-500" />
          <ProgressStat label="Carbs" current={totals.carbs} goal={goals.carbs} unit="g" icon={<CarbIcon className="text-cyan-400" />} gradient="from-blue-400 to-cyan-400" />
          <ProgressStat label="Fat" current={totals.fat} goal={goals.fat} unit="g" icon={<FatIcon className="text-orange-400" />} gradient="from-amber-400 to-orange-500" />
        </div>
      </div>
      
      <div className="flex justify-between items-center border-t border-cyan-300/20 pt-4 mb-2">
        <h4 className="font-bold text-lg text-slate-200">Logged Meals</h4>
        <button 
          onClick={onAddMealClick} 
          className="p-2 rounded-full text-cyan-400 hover:bg-cyan-400/10"
          aria-label="Add meal manually"
        >
          <AddIcon className="w-5 h-5"/>
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {dailyLog.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No meals logged yet today.</p>
        ) : (
          dailyLog.map((item) => (
            <div
              key={item.id}
              className="flex items-center p-2 bg-slate-800/50 rounded-lg group cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => onViewDetails(item)}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.foodName} className="w-12 h-12 rounded-md object-cover mr-4"/>
              ) : (
                <div className="w-12 h-12 rounded-md bg-slate-700 flex items-center justify-center mr-4">
                  <FoodIcon className="w-6 h-6 text-slate-400"/>
                </div>
              )}
              <div className="flex-grow">
                <p className="font-semibold text-slate-200 truncate">{item.foodName}</p>
                <p className="text-sm text-slate-400">{Math.round(item.nutrition.calories)} calories</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="ml-2 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-cyan-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                aria-label="Edit meal"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
