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
    return (
        <div className="bg-slate-800/50 rounded-lg group transform transition-transform duration-300 shadow-lg hover:shadow-cyan-500/10 relative">
            <div className="cursor-pointer" onClick={onSelect}>
                <div className="relative h-40 bg-slate-700 rounded-t-lg">
                    {recipe.imageUrl ? (
                        <img src={`data:image/jpeg;base64,${recipe.imageUrl}`} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-t-lg"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                           <FoodIcon className="w-12 h-12" />
                        </div>
                    )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-t-lg"></div>
                </div>
                <div className="p-4">
                    <h4 className="font-bold text-slate-100 truncate">{recipe.name}</h4>
                    <p className="text-xs text-slate-400 h-8 overflow-hidden">{recipe.description}</p>
                </div>
            </div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onUnsave();
                    soundService.play('stop');
                }}
                className="absolute top-2 right-2 p-2 bg-slate-900/50 text-slate-400 rounded-full hover:bg-red-500/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                aria-label="Unsave recipe"
            >
                <TrashIcon className="w-5 h-5" />
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
             <div className="corner-box text-center py-12 animate-fade-in">
                <BookmarkIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4"/>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">No Saved Recipes Yet</h2>
                <p className="text-slate-400">Head over to the Explore page to find and save recipes you like!</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
