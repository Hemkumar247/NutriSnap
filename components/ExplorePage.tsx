import React, { useState, useEffect } from 'react';
import { generateExploreRecipes } from '../services/apiClient';
import { DailyLogItem, MealPlanPreferences, ExploreCategory, ExploreRecipe } from '../types';
import { Spinner } from './Spinner';
import { RecipeInfoModal } from './RecipeInfoModal';
import { RecipeDetailModal } from './RecipeDetailModal';
import { BrainIcon, FoodIcon, ResetIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface ExplorePageProps {
    log: DailyLogItem[];
    preferences: MealPlanPreferences | null;
    savedRecipes: ExploreRecipe[];
    onSaveRecipe: (recipe: ExploreRecipe) => void;
    onUnsaveRecipe: (recipeId: string) => void;
}

const RecipeCard: React.FC<{ recipe: ExploreRecipe, onSelect: () => void }> = ({ recipe, onSelect }) => {
    const imageSrc = recipe.imageUrl
        ? (recipe.imageUrl.startsWith('http') ? recipe.imageUrl : `data:image/jpeg;base64,${recipe.imageUrl}`)
        : null;

    return (
        <div 
            className="group relative bg-slate-800/40 rounded-3xl overflow-hidden cursor-pointer transform hover:-translate-y-2 transition-all duration-500 shadow-xl hover:shadow-cyan-500/10 border border-white/5"
            onClick={onSelect}
        >
            <div className="relative h-48 bg-slate-900">
                {imageSrc ? (
                    <img src={imageSrc} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                       <FoodIcon className="w-12 h-12" />
                    </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                 <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="font-extrabold text-white text-lg tracking-tight drop-shadow-lg leading-tight">
                        <span className="bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-lg shadow-sm inline-block">{recipe.name}</span>
                    </h4>
                 </div>
            </div>
            <div className="p-5 bg-slate-800/60 border-t border-white/5 backdrop-blur-sm">
                <p className="text-[11px] text-slate-400 h-10 overflow-hidden line-clamp-2 italic mb-4 leading-relaxed line-clamp-2 opacity-80">"{recipe.description}"</p>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.1em]">
                    <span className="flex items-center gap-1.5 text-cyan-400 bg-cyan-950/30 px-2 py-1.5 rounded-xl border border-cyan-500/10">
                      <span className="text-xs">🔥</span> {Math.round(recipe.nutrition.calories)}
                    </span>
                    <span className="flex items-center gap-1.5 text-pink-400 bg-pink-950/30 px-2 py-1.5 rounded-xl border border-pink-500/10">
                      <span className="text-xs">💪</span> {Math.round(recipe.nutrition.protein)}g 
                    </span>
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

    const fetchRecipes = async () => {
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
                    id: recipe.id || `${category.categoryTitle}-${recipe.name}`.replace(/\s+/g, '-')
                }))
            }));
            
            setCategories(categoriesWithIds);
            soundService.play('success');
            
            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `nutrisnap_explore_cache_${today}`;
            localStorage.setItem(cacheKey, JSON.stringify(categoriesWithIds));

        } catch (err: any) {
            setError('Failed to fetch recipe ideas from web sources. Please check your connection.');
            soundService.play('stop');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `nutrisnap_explore_cache_${today}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
            setCategories(JSON.parse(cachedData));
            setIsLoading(false);
        } else {
            fetchRecipes();
        }
    }, [log, preferences]);


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

    return (
        <div className="space-y-12 animate-fade-in -mt-4 pb-12">
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-24 bg-slate-800/20 rounded-[3rem] border-2 border-dashed border-slate-800">
                    <Spinner />
                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Scanning the web...</p>
                </div>
            ) : error ? (
                <div className="bg-red-500/5 text-center py-12 rounded-[2rem] border border-red-500/20">
                    <p className="text-red-400 mb-6 font-bold">{error}</p>
                    <button onClick={() => fetchRecipes()} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all">Retry Loading</button>
                </div>
            ) : (!categories || categories.length === 0) ? (
                <div className="text-center py-24 bg-slate-800/10 rounded-[3rem]">
                    <div className="w-20 h-20 bg-slate-800 flex items-center justify-center rounded-3xl mx-auto mb-6">
                        <BrainIcon className="w-10 h-10 text-slate-600"/>
                    </div>
                    <h2 className="text-2xl font-black text-slate-200 mb-2 tracking-tight">Zero Results</h2>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm italic">"Try searching for something like 'Mediterranean Salad' or 'High Protein Pasta'."</p>
                </div>
            ) : (
                <div className="space-y-16">
                     {categories.map((category, catIndex) => (
                        <div key={category.categoryTitle} className="animate-fade-in-up" style={{ animationDelay: `${catIndex * 150}ms` }}>
                            <div className="flex items-center justify-between mb-8 px-2">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-1.5 bg-cyan-500 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">{category.categoryTitle}</h2>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{category.recipes.length} Results</span>
                            </div>
                            <div className="relative">
                                <div className="flex space-x-8 overflow-x-auto pb-8 scrollbar-hide px-2">
                                    {category.recipes.map((recipe, recipeIndex) => (
                                        <div className="flex-shrink-0 w-80" key={recipe.id}>
                                            <RecipeCard 
                                                recipe={recipe} 
                                                onSelect={() => handleSelectRecipe(recipe)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                     ))}
                </div>
            )}

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