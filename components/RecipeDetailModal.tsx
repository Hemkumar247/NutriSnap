import React, { useEffect } from 'react';
import { ExploreRecipe } from '../types';
import { ResetIcon, CheckIcon } from './IconComponents';

interface RecipeDetailModalProps {
    recipe: ExploreRecipe;
    onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({ recipe, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="relative bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl m-4 animate-fade-in border border-cyan-300/10 flex flex-col h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-cyan-300/20 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100 truncate pr-4">{recipe.name}</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 rounded-full hover:bg-slate-700 hover:text-slate-200 transition-colors"
                        aria-label="Close"
                    >
                        <ResetIcon className="w-5 h-5" />
                    </button>
                </header>

                <div className="overflow-y-auto p-6 flex-grow">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Ingredients */}
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-semibold text-cyan-300 mb-3">Ingredients</h3>
                            <ul className="space-y-2">
                                {recipe.ingredients.map((ingredient, index) => (
                                    <li key={index} className="flex items-start">
                                        <CheckIcon className="w-4 h-4 text-cyan-400 mt-1 mr-2 flex-shrink-0"/>
                                        <span className="text-slate-300 text-sm">{ingredient}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div className="md:col-span-2">
                             <h3 className="text-lg font-semibold text-cyan-300 mb-3">Instructions</h3>
                             <ol className="space-y-4">
                                {recipe.instructions.map((step, index) => (
                                    <li key={index} className="flex items-start">
                                        <div className="flex-shrink-0 mr-3 mt-0.5 w-6 h-6 bg-slate-700 text-cyan-300 text-sm font-bold flex items-center justify-center rounded-full">
                                            {index + 1}
                                        </div>
                                        <span className="text-slate-300 text-sm">{step}</span>
                                    </li>
                                ))}
                             </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
