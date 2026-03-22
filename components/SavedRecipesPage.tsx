import React, { useState } from 'react';
import { ExploreRecipe } from '../types';
import { RecipeInfoModal } from './RecipeInfoModal';
import { RecipeDetailModal } from './RecipeDetailModal';
import { BookmarkIcon, FoodIcon, TrashIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface SavedRecipesPageProps {
    recipes: ExploreRecipe[];
    onUnsaveRecipe: (recipeId: string) => void;
    onSaveRecipe: (recipe: ExploreRecipe) => void; 
}

const SavedRecipeCard: React.FC<{ recipe: ExploreRecipe, onSelect: () => void, onUnsave: () => void }> = ({ recipe, onSelect, onUnsave }) => {
    const imageSrc = recipe.imageUrl
        ? (recipe.imageUrl.startsWith('http') ? recipe.imageUrl : `data:image/jpeg;base64,${recipe.imageUrl}`)
        : null;

    return (
        <div className="group relative bg-slate-800/40 rounded-[2rem] overflow-hidden cursor-pointer transform hover:-translate-y-1 transition-all duration-300 shadow-xl border border-white/5">
            <div className="cursor-pointer" onClick={onSelect}>
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                    {imageSrc ? (
                        <img src={imageSrc} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                           <FoodIcon className="w-12 h-12" />
                        </div>
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                     <div className="absolute bottom-4 left-4 right-4">
                        <h4 className="font-extrabold text-white text-lg tracking-tight drop-shadow-md leading-tight">
                            <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-lg shadow-sm inline-block">{recipe.name}</span>
                        </h4>
                     </div>
                </div>
                <div className="p-5 bg-slate-800/60 border-t border-white/5">
                    <p className="text-[11px] text-slate-400 h-8 overflow-hidden opacity-80 italic line-clamp-2">"{recipe.description}"</p>
                </div>
            </div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onUnsave();
                    soundService.play('stop');
                }}
                className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md text-slate-400 rounded-full hover:bg-red-500/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-10"
                aria-label="Unsave recipe"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export const SavedRecipesPage: React.FC<SavedRecipesPageProps> = ({ recipes, onUnsaveRecipe, onSaveRecipe }) => {
    const [selectedRecipe, setSelectedRecipe] = useState<ExploreRecipe | null>(null);
    const [detailedRecipe, setDetailedRecipe] = useState<ExploreRecipe | null>(null);

    const handleSelectRecipe = (recipe: ExploreRecipe) => {
        setSelectedRecipe(recipe);
        soundService.play('click');
    };

    const handleOpenDetails = () => {
        if (selectedRecipe) {
            setDetailedRecipe(selectedRecipe);
            setSelectedRecipe(null);
        }
    };
    
    if (recipes.length === 0) {
        return (
             <div className="text-center py-24 bg-slate-800/10 rounded-[3rem] border-2 border-dashed border-slate-800/50 animate-fade-in">
                <div className="w-20 h-20 bg-slate-800 flex items-center justify-center rounded-3xl mx-auto mb-6">
                    <BookmarkIcon className="w-10 h-10 text-slate-600"/>
                </div>
                <h2 className="text-2xl font-black text-slate-200 mb-2">Empty Cookbook</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm italic">"Your saved recipes will appear here. Go explore some healthy ideas!"</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-12">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-1.5 bg-yellow-400 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.5)]"></div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Saved Favorites</h2>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {recipes.map(recipe => (
                    <SavedRecipeCard 
                        key={recipe.id}
                        recipe={recipe}
                        onSelect={() => handleSelectRecipe(recipe)}
                        onUnsave={() => onUnsaveRecipe(recipe.id)}
                    />
                ))}
            </div>

            {selectedRecipe && (
                <RecipeInfoModal 
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    onOpenDetails={handleOpenDetails}
                    isSaved={recipes.some(r => r.id === selectedRecipe.id)}
                    onSave={() => onSaveRecipe(selectedRecipe)}
                    onUnsave={() => onUnsaveRecipe(selectedRecipe.id)}
                />
            )}
            
            {detailedRecipe && (
                <RecipeDetailModal
                    recipe={detailedRecipe}
                    onClose={() => setDetailedRecipe(null)}
                />
            )}
        </div>
    );
};
