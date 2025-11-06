import React, { useEffect } from 'react';
import type { DailyLogItem } from '../types';
import { ResetIcon, CalorieIcon, ProteinIcon, CarbIcon, FatIcon, FoodIcon } from './IconComponents';

interface MealDetailModalProps {
    item: DailyLogItem;
    onClose: () => void;
}

// FIX: The 'icon' prop type was too generic. Making it specific to SVG props
// allows cloning with className without TypeScript errors.
const NutritionStat: React.FC<{ label: string; value: number; unit: string; icon: React.ReactElement<React.SVGProps<SVGSVGElement>> }> = ({ label, value, unit, icon }) => (
    <div className="flex flex-col items-center justify-center bg-slate-800/50 p-3 rounded-lg text-center">
        {/* FIX: Merged existing icon className with new classes to prevent style override and fix type error. */}
        {React.cloneElement(icon, { className: `${icon.props.className || ''} w-6 h-6 mb-1` })}
        <p className="font-bold text-slate-100 text-lg">{Math.round(value)}</p>
        <p className="text-xs text-slate-400">{label} ({unit})</p>
    </div>
);

export const MealDetailModal: React.FC<MealDetailModalProps> = ({ item, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true"></div>
            <div className="relative bg-slate-900/70 backdrop-blur-lg border border-cyan-300/20 rounded-2xl shadow-xl w-full max-w-xs m-4 animate-fade-in">
                {/* Image */}
                {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.foodName} className="w-full h-40 object-cover rounded-t-2xl"/>
                ) : (
                    <div className="w-full h-40 bg-slate-800 flex items-center justify-center rounded-t-2xl">
                        <FoodIcon className="w-16 h-16 text-slate-500"/>
                    </div>
                )}
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-1.5 rounded-full hover:bg-slate-800 hover:scale-110 transition-all"
                    aria-label="Close details"
                >
                    <ResetIcon className="w-4 h-4" />
                </button>

                {/* Content */}
                <div className="p-5">
                    <h3 className="text-xl font-bold text-cyan-300 truncate">{item.foodName}</h3>
                    <p className="text-xs text-slate-400 mb-4">
                        Logged at: {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    <div className="space-y-3">
                         <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <CalorieIcon className="w-6 h-6 text-cyan-400 mr-3" />
                                <span className="font-semibold text-slate-200">Calories</span>
                            </div>
                            <span className="text-2xl font-bold text-slate-100">{Math.round(item.nutrition.calories)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <NutritionStat label="Protein" value={item.nutrition.protein} unit="g" icon={<ProteinIcon className="text-pink-400" />} />
                            <NutritionStat label="Carbs" value={item.nutrition.carbs} unit="g" icon={<CarbIcon className="text-sky-400" />} />
                            <NutritionStat label="Fat" value={item.nutrition.fat} unit="g" icon={<FatIcon className="text-orange-400" />} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
