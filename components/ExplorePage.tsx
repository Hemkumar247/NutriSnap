import React, { useState, useEffect, useCallback } from 'react';
import { generateExploreRecipes, generateRecipeImage } from '../services/geminiService';
import { DailyLogItem, MealPlanPreferences, ExploreCategory, ExploreRecipe } from '../types';
import { Spinner } from './Spinner';
import { RecipeInfoModal } from './RecipeInfoModal';
import { RecipeDetailModal } from './RecipeDetailModal';
import { BrainIcon, FoodIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ExplorePageProps {
    log: DailyLogItem[];
    preferences: MealPlanPreferences | null;
    savedRecipes: ExploreRecipe[];
    onSaveRecipe: (recipe: ExploreRecipe) => void;
    onUnsaveRecipe: (recipeId: string) => void;
}

const RecipeCard: React.FC<{ recipe: ExploreRecipe, onSelect: () => void }> = ({ recipe, onSelect }) => {
    return (
        <div 
            className="bg-slate-800/50 rounded-lg overflow-hidden group cursor-pointer transform hover:-translate-y-1 transition-transform duration-300 shadow-lg hover:shadow-cyan-500/10"
            onClick={onSelect}
        >
            <div className="relative h-40 bg-slate-700">
                {recipe.imageIsGenerating ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <Spinner />
                    </div>
                ) : recipe.imageUrl ? (
                    <img src={`data:image/jpeg;base64,${recipe.imageUrl}`} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                       <FoodIcon className="w-12 h-12" />
                    </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div className="p-4">
                <h4 className="font-bold text-slate-100 truncate">{recipe.name}</h4>
                <p className="text-xs text-slate-400 h-8 overflow-hidden">{recipe.description}</p>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-300">
                    <span>🔥 {Math.round(recipe.nutrition.calories)} kcal</span>
                    <span>💪 {Math.round(recipe.nutrition.protein)}g P</span>
                </div>
            </div>
        </div>
    );
};


export const ExplorePage: React.FC<ExplorePageProps> = ({ log, preferences, savedRecipes, onSaveRecipe, onUnsaveRecipe }) => {
    const [categories, setCategories] = useState<ExploreCategory[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedRecipe, setSelectedRecipe] = useState<ExploreRecipe | null>(null);
    const [detailedRecipe, setDetailedRecipe] = useState<ExploreRecipe | null>(null);

    const handleGenerateImage = useCallback(async (categoryIndex: number, recipeIndex: number, currentCategories: ExploreCategory[]) => {
        let recipeToProcess = currentCategories[categoryIndex]?.recipes[recipeIndex];
        
        if (!recipeToProcess || recipeToProcess.imageUrl || recipeToProcess.imageIsGenerating) return;

        setCategories(prev => {
            if (!prev) return null;
            const newCategories = JSON.parse(JSON.stringify(prev)); // Deep copy to safely mutate
            newCategories[categoryIndex].recipes[recipeIndex].imageIsGenerating = true;
            return newCategories;
        });

        try {
            const imageBytes = await generateRecipeImage(recipeToProcess.name, recipeToProcess.description);
            setCategories(prev => {
                if (!prev) return null;
                const newCategories = JSON.parse(JSON.stringify(prev));
                const targetRecipe = newCategories[categoryIndex].recipes[recipeIndex];
                targetRecipe.imageUrl = imageBytes;
                targetRecipe.imageIsGenerating = false;
                
                // Update local storage cache
                const today = new Date().toISOString().split('T')[0];
                localStorage.setItem(`nutrisnap_explore_cache_${today}`, JSON.stringify(newCategories));

                return newCategories;
            });
        } catch (err) {
            console.error(`Failed to generate image for ${recipeToProcess.name}`, err);
             setCategories(prev => {
                if (!prev) return null;
                const newCategories = JSON.parse(JSON.stringify(prev));
                newCategories[categoryIndex].recipes[recipeIndex].imageIsGenerating = false; // Stop loading on error
                return newCategories;
            });
        }
    }, []);

    useEffect(() => {
        const fetchOrLoadRecipes = async () => {
            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `nutrisnap_explore_cache_${today}`;
            
            try {
                const cachedData = localStorage.getItem(cacheKey);
                if (cachedData) {
                    setCategories(JSON.parse(cachedData));
                    setIsLoading(false);
                    return;
                }
            } catch (e) {
                console.error("Failed to read from cache", e);
            }


            setIsLoading(true);
            setError(null);
            soundService.play('start');
            try {
                const context = {
                    log: log.map(({ foodName }) => ({ foodName })),
                    prefs: preferences
                };
                const results = await generateExploreRecipes(context);
                
                const categoriesWithIds = results.map(category => ({
                    ...category,
                    recipes: category.recipes.map(recipe => ({
                        ...recipe,
                        id: `${category.categoryTitle}-${recipe.name}`.replace(/\s+/g, '-')
                    }))
                }));
                
                setCategories(categoriesWithIds);
                soundService.play('success');
                
                try {
                   localStorage.setItem(cacheKey, JSON.stringify(categoriesWithIds));
                } catch (e) {
                   console.error("Failed to save to cache", e);
                }

                // Eagerly load the first image of each category for better UX
                if (categoriesWithIds.length > 0) {
                    categoriesWithIds.forEach((category, catIndex) => {
                        if (category.recipes.length > 0) {
                            handleGenerateImage(catIndex, 0, categoriesWithIds);
                        }
                    });
                }

            } catch (err: any) {
                setError('Failed to fetch recipe ideas. Please try again later.');
                soundService.play('stop');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrLoadRecipes();
    }, [log, preferences, handleGenerateImage]);

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
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-12 corner-box">
                <Spinner />
                <p className="text-slate-300 font-semibold">Generating delicious recipe ideas for you...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="corner-box text-center py-8">
                <p className="text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>
            </div>
        );
    }
    
     if (!categories || categories.length === 0) {
        return (
            <div className="corner-box text-center py-12">
                <BrainIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4"/>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">No Recipes Found</h2>
                <p className="text-slate-400">We couldn't generate any recipes right now. Try again in a bit!</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {categories.map((category, catIndex) => (
                <div key={category.categoryTitle}>
                    <h2 className="text-2xl font-bold text-cyan-300 mb-4">{category.categoryTitle}</h2>
                     <div className="relative">
                        <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                            {category.recipes.map((recipe, recipeIndex) => (
                                <div className="flex-shrink-0 w-64" key={recipe.id}>
                                    <RecipeCard 
                                        recipe={recipe} 
                                        onSelect={() => handleSelectRecipe(recipe)}
                                    />
                                </div>
                            ))}
                             <div className="flex-shrink-0 w-1"></div>
                        </div>
                    </div>
                </div>
            ))}

            {selectedRecipe && (
                <RecipeInfoModal 
                    recipe={selectedRecipe}
                    onClose={() => setSelectedRecipe(null)}
                    onOpenDetails={handleOpenDetails}
                    isSaved={savedRecipes.some(r => r.id === selectedRecipe.id)}
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