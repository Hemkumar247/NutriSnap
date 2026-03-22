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

const NutritionStat: React.FC<{ label: string, value: number, unit: string, icon: React.ReactNode }> = ({ label, value, unit, icon }) => (
    <div className="flex items-center space-x-3 bg-slate-800/80 p-3 rounded-xl border border-white/5 shadow-inner">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-900/50 rounded-lg text-slate-100">
             {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: `${(icon as React.ReactElement<any>).props.className || ''} w-5 h-5` }) : icon}
        </div>
        <div>
            <p className="text-base font-black text-slate-100 leading-none">{Math.round(value)}{unit}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">{label}</p>
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

    const imageSrc = recipe.imageUrl
        ? (recipe.imageUrl.startsWith('http') ? recipe.imageUrl : `data:image/jpeg;base64,${recipe.imageUrl}`)
        : null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="relative bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl animate-fade-in overflow-hidden border border-white/10"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative h-64 md:h-80 w-full">
                     {imageSrc ? (
                        <img src={imageSrc} alt={recipe.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
                             <FoodIcon className="w-16 h-16"/>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/60 transition-all z-10"
                        aria-label="Close"
                    >
                        <ResetIcon className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-8 left-8 right-8">
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                            <span className="bg-yellow-400 text-slate-950 px-3 py-1 rounded-xl shadow-2xl inline-block">{recipe.name}</span>
                        </h2>
                    </div>
                </div>

                <div className="p-8">
                    <p className="text-slate-300 text-lg leading-relaxed mb-8 border-l-4 border-cyan-500/30 pl-4 italic opacity-90">"{recipe.description}"</p>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        <NutritionStat label="Calories" value={recipe.nutrition.calories} unit="" icon={<CalorieIcon className="text-cyan-400"/>}/>
                        <NutritionStat label="Protein" value={recipe.nutrition.protein} unit="g" icon={<ProteinIcon className="text-pink-400"/>}/>
                        <NutritionStat label="Carbs" value={recipe.nutrition.carbs} unit="g" icon={<CarbIcon className="text-sky-400"/>}/>
                        <NutritionStat label="Fat" value={recipe.nutrition.fat} unit="g" icon={<FatIcon className="text-orange-400"/>}/>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                         <button 
                            onClick={handleSaveToggle}
                            className={`flex items-center justify-center w-full px-6 py-4 font-black rounded-xl transition-all text-xs uppercase tracking-[0.2em] ${isSaved ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/20 active:scale-95' : 'bg-slate-700 hover:bg-slate-600 text-white active:scale-95'}`}
                        >
                            <BookmarkIcon className="w-5 h-5 mr-2" style={{ fill: isSaved ? 'currentColor' : 'none' }}/>
                            {isSaved ? 'Recipe Saved' : 'Save to Favorites'}
                        </button>
                         <button 
                            onClick={onOpenDetails}
                            className="w-full px-8 py-4 bg-white text-slate-900 font-black rounded-xl hover:shadow-xl transition-all text-xs uppercase tracking-[0.2em] active:scale-95"
                        >
                            View Full Recipe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};