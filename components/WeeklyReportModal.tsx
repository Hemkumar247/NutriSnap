


import React, { useMemo, useEffect } from 'react';
import type { DailyLogItem, NutritionInfo } from '../types';
import { ResetIcon, CalorieIcon, ProteinIcon, CarbIcon, FatIcon, ChartBarIcon } from './IconComponents';
import { processWeeklyData } from '../utils/dataUtils';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLogItem[];
  goals: NutritionInfo;
}

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>> }> = ({ label, value, icon }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center">
        {React.cloneElement(icon, { className: `${icon.props.className || ''} w-7 h-7 mr-4` })}
        <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="font-bold text-slate-100 text-lg">{value}</p>
        </div>
    </div>
);

const NutrientBar: React.FC<{ nutrient: keyof NutritionInfo; value: number; goal: number; color: string }> = ({ nutrient, value, goal, color }) => {
    const percentage = goal > 0 ? Math.min((value / goal) * 100, 120) : 0; // Cap at 120% for viz
    return (
        <div className="flex items-center">
            <div className="w-16 text-xs text-slate-400 capitalize">{nutrient}</div>
            <div className="flex-1 bg-slate-700 rounded-full h-4">
                <div 
                    className={`${color} h-4 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="w-20 text-right text-xs font-semibold">{Math.round(value)}/{goal}</div>
        </div>
    );
};

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ isOpen, onClose, log, goals }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const weeklyData = useMemo(() => processWeeklyData(log), [log]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            role="dialog" aria-modal="true"
        >
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-slate-900/70 backdrop-blur-lg border border-cyan-300/20 rounded-2xl shadow-xl w-full max-w-2xl h-[90vh] flex flex-col m-4 animate-fade-in">
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-cyan-300/20">
                    <div className="flex items-center">
                        <ChartBarIcon className="w-6 h-6 mr-3 text-cyan-400" />
                        <h2 className="text-xl font-bold text-slate-100">Weekly Analytics</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 rounded-full hover:bg-slate-700" aria-label="Close report">
                        <ResetIcon className="w-5 h-5" />
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-cyan-300 mb-3">Weekly Averages (per logged day)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="Avg. Calories" value={Math.round(weeklyData.calorieAvg).toLocaleString()} icon={<CalorieIcon className="text-cyan-400"/>} />
                            <StatCard label="Avg. Protein" value={`${Math.round(weeklyData.proteinAvg)}g`} icon={<ProteinIcon className="text-pink-400"/>} />
                            <StatCard label="Avg. Carbs" value={`${Math.round(weeklyData.carbAvg)}g`} icon={<CarbIcon className="text-sky-400"/>} />
                            <StatCard label="Avg. Fat" value={`${Math.round(weeklyData.fatAvg)}g`} icon={<FatIcon className="text-orange-400"/>} />
                        </div>
                    </div>
                    
                    <div>
                         <h3 className="text-lg font-semibold text-cyan-300 mb-4">Daily Breakdown vs Goals</h3>
                         <div className="space-y-4">
                            {/* FIX: Explicitly type the result of Object.entries to ensure 'totals' is recognized as NutritionInfo. */}
                            {(Object.entries(weeklyData.dailyTotals) as [string, NutritionInfo][]).sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime()).map(([dateStr, totals]) => {
                                const date = new Date(dateStr);
                                const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                                return (
                                    <div key={dateStr} className="bg-slate-800/30 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-3">
                                            <p className="font-bold text-slate-200">{dayLabel}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</p>
                                            <p className="text-sm font-semibold text-cyan-400">{Math.round(totals.calories)} kcal</p>
                                        </div>
                                        <div className="space-y-2">
                                            <NutrientBar nutrient="protein" value={totals.protein} goal={goals.protein} color="bg-gradient-to-r from-purple-500 to-pink-500" />
                                            <NutrientBar nutrient="carbs" value={totals.carbs} goal={goals.carbs} color="bg-gradient-to-r from-blue-400 to-cyan-400" />
                                            <NutrientBar nutrient="fat" value={totals.fat} goal={goals.fat} color="bg-gradient-to-r from-amber-400 to-orange-500" />
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};