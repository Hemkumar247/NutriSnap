import React, { useState, useCallback } from 'react';
import { MealPlan, MealPlanPreferences, NutritionInfo, DailyMealPlan } from '../types';
import { generateMealPlan } from '../services/geminiService';
import { Spinner } from './Spinner';
import { BrainIcon, CalorieIcon, CarbIcon, FatIcon, ProteinIcon } from './IconComponents';
import { soundService } from '../services/soundService';

interface MealPlanGeneratorPageProps {
  preferences: MealPlanPreferences | null;
  goals: NutritionInfo;
  onSavePreferences: (prefs: MealPlanPreferences) => void;
  mealPlan: MealPlan | null;
  onPlanGenerated: (plan: MealPlan) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; }> = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between">
        <label htmlFor="veg-toggle" className="text-sm font-medium text-slate-300">{label}</label>
        <button
            id="veg-toggle"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${checked ? 'bg-cyan-400' : 'bg-slate-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}/>
        </button>
    </div>
);


const PreferenceForm: React.FC<{ onSave: (prefs: MealPlanPreferences) => void; isLoading: boolean }> = ({ onSave, isLoading }) => {
    const [prefs, setPrefs] = useState<MealPlanPreferences>({
        favBreakfast: '',
        favLunch: '',
        favDinner: '',
        dislikes: '',
        isVegetarian: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setPrefs({ ...prefs, [e.target.name]: e.target.value });
    };

    const handleToggle = (isChecked: boolean) => {
        setPrefs({ ...prefs, isVegetarian: isChecked });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(prefs);
    };
    
    const isFormValid = prefs.favBreakfast.trim() && prefs.favLunch.trim() && prefs.favDinner.trim();

    return (
        <div className="corner-box animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-300 mb-2">First, Let's Personalize Your Plan</h2>
            <p className="text-slate-400 mb-6">Tell us about your favorite meals to get a plan you'll love. This helps the AI understand your taste.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="favBreakfast" className="block text-sm font-medium text-slate-300 mb-1">Favorite Breakfast</label>
                    <input type="text" name="favBreakfast" id="favBreakfast" value={prefs.favBreakfast} onChange={handleChange} placeholder="e.g., Scrambled eggs and avocado toast" className="w-full input-style" required/>
                </div>
                 <div>
                    <label htmlFor="favLunch" className="block text-sm font-medium text-slate-300 mb-1">Favorite Lunch</label>
                    <input type="text" name="favLunch" id="favLunch" value={prefs.favLunch} onChange={handleChange} placeholder="e.g., Grilled chicken salad" className="w-full input-style" required/>
                </div>
                 <div>
                    <label htmlFor="favDinner" className="block text-sm font-medium text-slate-300 mb-1">Favorite Dinner</label>
                    <input type="text" name="favDinner" id="favDinner" value={prefs.favDinner} onChange={handleChange} placeholder="e.g., Salmon with roasted vegetables" className="w-full input-style" required/>
                </div>
                <div>
                    <label htmlFor="dislikes" className="block text-sm font-medium text-slate-300 mb-1">Allergies or Foods to Avoid (optional)</label>
                    <textarea name="dislikes" id="dislikes" value={prefs.dislikes} onChange={handleChange} placeholder="e.g., Shellfish, peanuts, mushrooms" className="w-full input-style" rows={2}/>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                    <ToggleSwitch
                        checked={prefs.isVegetarian}
                        onChange={handleToggle}
                        label="Vegetarian Plan"
                    />
                </div>
                <div className="text-center pt-4">
                    <button type="submit" disabled={!isFormValid || isLoading} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : 'Generate My First Plan'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const MealCard: React.FC<{ title: string, meal: {name: string, calories: number} }> = ({ title, meal }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex-1">
        <p className="text-sm font-bold text-cyan-400">{title}</p>
        <p className="text-slate-200 font-semibold">{meal.name}</p>
        <p className="text-xs text-slate-400">{Math.round(meal.calories)} kcal</p>
    </div>
);

const DailyPlanCard: React.FC<{ dailyPlan: DailyMealPlan }> = ({ dailyPlan }) => (
    <div className="bg-slate-900/40 p-4 rounded-xl border border-cyan-300/10">
        <h4 className="text-xl font-bold text-slate-100 mb-3">{dailyPlan.day}</h4>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
            <MealCard title="Breakfast" meal={dailyPlan.meals.breakfast} />
            <MealCard title="Lunch" meal={dailyPlan.meals.lunch} />
            <MealCard title="Dinner" meal={dailyPlan.meals.dinner} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-center">
            <div className="bg-slate-800 p-2 rounded-md"><CalorieIcon className="w-4 h-4 mx-auto mb-1 text-cyan-300"/>{Math.round(dailyPlan.dailyTotals.calories)} kcal</div>
            <div className="bg-slate-800 p-2 rounded-md"><ProteinIcon className="w-4 h-4 mx-auto mb-1 text-pink-400"/>{Math.round(dailyPlan.dailyTotals.protein)}g Protein</div>
            <div className="bg-slate-800 p-2 rounded-md"><CarbIcon className="w-4 h-4 mx-auto mb-1 text-sky-400"/>{Math.round(dailyPlan.dailyTotals.carbs)}g Carbs</div>
            <div className="bg-slate-800 p-2 rounded-md"><FatIcon className="w-4 h-4 mx-auto mb-1 text-orange-400"/>{Math.round(dailyPlan.dailyTotals.fat)}g Fat</div>
        </div>
    </div>
);

const PlanDisplay: React.FC<{ plan: MealPlan; onRegenerate: (feedback: string) => void; isLoading: boolean }> = ({ plan, onRegenerate, isLoading }) => {
    const [feedback, setFeedback] = useState('');

    const handleRegenerate = () => {
        onRegenerate(feedback);
        setFeedback('');
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {plan.plan.map(daily => <DailyPlanCard key={daily.day} dailyPlan={daily} />)}
            </div>
            <div className="corner-box">
                 <h3 className="text-xl font-bold text-cyan-300 mb-2">Not quite right?</h3>
                 <p className="text-slate-400 mb-4">Provide feedback to refine your next meal plan.</p>
                 <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="e.g., 'Less red meat, more fish options please. And maybe a simpler breakfast.'"
                    className="w-full input-style mb-4"
                    rows={3}
                 />
                 <div className="text-center">
                     <button onClick={handleRegenerate} disabled={isLoading} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none disabled:cursor-not-allowed">
                        {isLoading ? 'Regenerating...' : 'Regenerate Plan'}
                    </button>
                 </div>
            </div>
        </div>
    );
};

const PreferencesDisplay: React.FC<{ prefs: MealPlanPreferences; onPrefsChange: (prefs: MealPlanPreferences) => void; }> = ({ prefs, onPrefsChange }) => {
    const handleToggle = (isVegetarian: boolean) => {
        onPrefsChange({ ...prefs, isVegetarian });
    };

    return (
        <div className="corner-box mb-8">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">Your Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                    <p className="font-semibold text-slate-400">Breakfast</p>
                    <p className="text-slate-200">{prefs.favBreakfast}</p>
                </div>
                 <div>
                    <p className="font-semibold text-slate-400">Lunch</p>
                    <p className="text-slate-200">{prefs.favLunch}</p>
                </div>
                 <div>
                    <p className="font-semibold text-slate-400">Dinner</p>
                    <p className="text-slate-200">{prefs.favDinner}</p>
                </div>
            </div>
             <div className="bg-slate-800/50 p-3 rounded-lg">
                <ToggleSwitch
                    checked={prefs.isVegetarian}
                    onChange={handleToggle}
                    label="Vegetarian Plan"
                />
            </div>
        </div>
    );
};


export const MealPlanGeneratorPage: React.FC<MealPlanGeneratorPageProps> = ({ preferences, goals, onSavePreferences, mealPlan, onPlanGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (prefs: MealPlanPreferences, feedback?: string) => {
    setIsLoading(true);
    setError(null);
    soundService.play('start');
    try {
      const result = await generateMealPlan(prefs, goals, feedback);
      onPlanGenerated(result);
      soundService.play('success');
    } catch (err: any) {
      setError('An error occurred while generating the meal plan. Please try again.');
      soundService.play('stop');
    } finally {
      setIsLoading(false);
    }
  }, [goals, onPlanGenerated]);

  const handleSavePreferences = (newPrefs: MealPlanPreferences) => {
      onSavePreferences(newPrefs);
      handleGenerate(newPrefs);
  };
  
  const handleRegenerate = (feedback: string) => {
      if(preferences) {
          handleGenerate(preferences, feedback);
      }
  };

  return (
    <div className="animate-fade-in space-y-8">
      {error && (
          <div className="corner-box text-center py-8">
              <p className="text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>
              <button onClick={() => setError(null)} className="px-5 py-2.5 bg-cyan-500 text-white font-semibold rounded-full hover:bg-cyan-600 transition-all">
                  Try Again
              </button>
          </div>
      )}

      {!preferences ? (
        <PreferenceForm onSave={handleSavePreferences} isLoading={isLoading} />
      ) : (
        <>
        <PreferencesDisplay prefs={preferences} onPrefsChange={onSavePreferences} />
        {isLoading && !mealPlan ? (
             <div className="flex flex-col items-center justify-center space-y-4 py-12 corner-box">
                <Spinner />
                <p className="text-slate-300 font-semibold">Generating your personalized meal plan...</p>
            </div>
          ) : mealPlan ? (
            <PlanDisplay plan={mealPlan} onRegenerate={handleRegenerate} isLoading={isLoading} />
          ) : (
            // Fallback for when preferences exist but no plan yet (e.g., page reload)
            <div className="corner-box text-center">
                 <BrainIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4"/>
                 <h2 className="text-2xl font-bold text-slate-100 mb-2">Ready to create your meal plan?</h2>
                 <p className="text-slate-400 mb-6">We'll use your saved preferences to generate a new plan.</p>
                <button onClick={() => handleGenerate(preferences)} disabled={isLoading} className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg">
                    {isLoading ? 'Generating...' : 'Generate Meal Plan'}
                </button>
            </div>
          )}
        </>
      )}
      <style>{`
        .input-style {
            background-color: #1e293b; /* slate-800 */
            color: #e2e8f0; /* slate-200 */
            border: 1px solid #475569; /* slate-600 */
            border-radius: 0.375rem; /* rounded-md */
            padding: 0.5rem 0.75rem;
            width: 100%;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
        }
        .input-style:focus {
            outline: none;
            border-color: #22d3ee; /* cyan-400 */
            box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.5);
        }
        .input-style::placeholder {
            color: #64748b; /* slate-500 */
        }
      `}</style>
    </div>
  );
};