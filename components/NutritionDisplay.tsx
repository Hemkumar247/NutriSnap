import React from 'react';
import type { AnalysisResult } from '../types';
import { CalorieIcon, ProteinIcon, CarbIcon, FatIcon } from './IconComponents';

interface NutritionDisplayProps {
  analysis: AnalysisResult;
}

const MacroBar: React.FC<{ value: number; total: number; color: string; label: string; unit: string; icon: React.ReactElement }> = ({ value, total, color, label, unit, icon }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-400 flex items-center">
          {icon}
          <span className="ml-2">{label}</span>
        </span>
        <span className="text-sm font-semibold text-slate-200">{Math.round(value)}{unit}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5">
        <div className={`bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${percentage}%`, height: '100%', borderRadius: '9999px' }}></div>
      </div>
    </div>
  );
};

export const NutritionDisplay: React.FC<NutritionDisplayProps> = ({ analysis }) => {
  const { foodName, nutrition } = analysis;
  const totalMacros = nutrition.protein + nutrition.carbs + nutrition.fat;

  return (
    <div className="mt-6 space-y-6 animate-fade-in">
      <h3 className="text-3xl font-bold text-center text-cyan-400">{foodName}</h3>
      
      <div className="bg-slate-900/30 border border-cyan-300/20 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-center justify-center text-center">
            <CalorieIcon className="w-10 h-10 text-cyan-400 mb-2"/>
            <span className="text-5xl font-extrabold text-slate-100">{Math.round(nutrition.calories)}</span>
            <span className="text-slate-400 font-medium">Calories</span>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-slate-200 mb-2 text-center md:text-left">Macronutrients</h4>
            <MacroBar value={nutrition.protein} total={totalMacros} color="from-purple-500 to-pink-500" label="Protein" unit="g" icon={<ProteinIcon className="w-4 h-4 text-pink-400"/>} />
            <MacroBar value={nutrition.carbs} total={totalMacros} color="from-blue-400 to-cyan-400" label="Carbs" unit="g" icon={<CarbIcon className="w-4 h-4 text-cyan-400" />} />
            <MacroBar value={nutrition.fat} total={totalMacros} color="from-amber-400 to-orange-500" label="Fat" unit="g" icon={<FatIcon className="w-4 h-4 text-orange-400" />} />
          </div>
        </div>
      </div>
    </div>
  );
};
