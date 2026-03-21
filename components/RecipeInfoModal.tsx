import React, { useEffect } from 'react';
import { ExploreRecipe } from '../types';
import { ResetIcon, CalorieIcon, ProteinIcon, CarbIcon, FatIcon, FoodIcon, BookmarkIcon } from './IconComponents';

interface RecipeInfoModalProps {
    recipe: ExploreRecipe;
    onClose: () => void;
    onOpenDetails: () => void;
    isSaved: boolean;
    onSave: () => void;
    onUnsave: () => void;
}

const NutritionStat: React.FC<{ label: string, value: number, unit: string, icon: React.ReactElement }> = ({ label, value, unit, icon }) => (
    <div className="flex items-center space-x-2 bg-slate-800/50 p-2 rounded-lg">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
        <div>
            <p className="text-sm font-bold text-slate-100">{Math.round(value)}{unit}</p>
            <p className="text-xs text-slate-400">{label}</p>
        </div>
    </div>
);


export const RecipeInfoModal: React.FC<RecipeInfoModalProps> = ({ recipe, onClose, onOpenDetails, isSaved, onSave, onUnsave }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSaveToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSaved) {
            onUnsave();
        } else {
            onSave();
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="relative bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl m-4 animate-fade-in overflow-hidden border border-cyan-300/10"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative h-64 md:h-80 w-full">
                     {recipe.imageUrl ? (
                        <img src={`data:image/jpeg;base64,${recipe.imageUrl}`} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                             <FoodIcon className="w-16 h-16"/>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-2 rounded-full hover:bg-slate-800 hover:scale-110 transition-all"
                        aria-label="Close"
                    >
                        <ResetIcon className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-6 left-6 right-6">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white">{recipe.name}</h2>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-slate-300 mb-6">{recipe.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <NutritionStat label="Calories" value={recipe.nutrition.calories} unit="" icon={<CalorieIcon className="text-cyan-400"/>}/>
                        <NutritionStat label="Protein" value={recipe.nutrition.protein} unit="g" icon={<ProteinIcon className="text-pink-400"/>}/>
                        <NutritionStat label="Carbs" value={recipe.nutrition.carbs} unit="g" icon={<CarbIcon className="text-sky-400"/>}/>
                        <NutritionStat label="Fat" value={recipe.nutrition.fat} unit="g" icon={<FatIcon className="text-orange-400"/>}/>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                         <button 
                            onClick={handleSaveToggle}
                            className={`flex items-center justify-center w-full sm:w-auto px-6 py-3 border-2 font-bold rounded-full transition-all text-lg ${isSaved ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300' : 'border-transparent bg-slate-700 hover:bg-slate-600 text-white'}`}
                        >
                            <BookmarkIcon className="w-6 h-6 mr-2" style={{ fill: isSaved ? 'currentColor' : 'none' }}/>
                            {isSaved ? 'Saved' : 'Save Recipe'}
                        </button>
                         <button 
                            onClick={onOpenDetails}
                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg"
                        >
                            View Full Recipe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};