import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SideMenu } from './components/SideMenu';
import { ImageUploader } from './components/ImageUploader';
import { NutritionDisplay } from './components/NutritionDisplay';
import { DailyTracker } from './components/DailyTracker';
import * as apiClient from './services/apiClient';
import * as dbService from './services/dbService';
import { auth } from './lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { AnalysisResult, DailyLogItem, NutritionInfo, AppView, MealPlanPreferences, MealPlan, UserProfile, AppSettings } from './types';
import { Spinner } from './components/Spinner';
import { ResetIcon, LightbulbIcon } from './components/IconComponents';
import { EditLogModal } from './components/EditLogModal';
import { HistoryModal } from './components/HistoryModal';
import { AddMealModal } from './components/AddMealModal';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { MealDetailModal } from './components/MealDetailModal';
import { soundService } from './services/soundService';
import { DeepAnalysisPage } from './components/DeepAnalysisPage';
import { MealPlanGeneratorPage } from './components/MealPlanGeneratorPage';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { ConfirmationModal } from './components/ConfirmationModal';


type DietMode = 'maintenance' | 'loss' | 'gain';

const PRESET_GOALS: Record<DietMode, NutritionInfo> = {
  maintenance: { calories: 2000, protein: 120, carbs: 250, fat: 65 },
  loss: { calories: 1600, protein: 130, carbs: 150, fat: 55 },
  gain: { calories: 2500, protein: 150, carbs: 300, fat: 80 },
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Hem Kumar',
  age: 30,
  gender: 'male',
  height: 175, // cm
  weight: 70, // kg
  activityLevel: 'moderate'
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  units: 'metric'
};

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DailyLogItem | null>(null);
  
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState<boolean>(false);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedLogItem, setSelectedLogItem] = useState<DailyLogItem | null>(null);

  const [dietMode, setDietMode] = useState<DietMode>('maintenance');
  const [dailyGoals, setDailyGoals] = useState<NutritionInfo>(PRESET_GOALS.maintenance);
  
  // Water intake state
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(2500); // Default 2.5L

  // Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  
  // Side Menu State
  const [isMenuCollapsed, setIsMenuCollapsed] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  // Meal Plan State
  const [mealPlanPreferences, setMealPlanPreferences] = useState<MealPlanPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

   // Profile & Settings State
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push('/login'); return; }
      setUserId(user.uid);
      const today = new Date().toISOString().split('T')[0];
      try {
        const [log, settings, profile, water, mealPrefs, savedRecs, lastPlan] = await Promise.all([
          dbService.getTodayLog(user.uid),
          dbService.getSettings(user.uid),
          dbService.getUserProfile(user.uid),
          dbService.getWaterLog(user.uid, today),
          dbService.getMealPlanPreferences(user.uid),
          dbService.getSavedRecipes(user.uid),
          dbService.getLastMealPlan(user.uid),
        ]);
        if (log.length) setDailyLog(log);
        if (settings) {
          setAppSettings({ theme: settings.theme, units: settings.units });
          setDietMode(settings.dietMode as any);
          setDailyGoals(settings.goals);
          document.documentElement.className = settings.theme;
        }
        if (profile) setUserProfile(profile);
        if (water) { setWaterIntake(water.intake); setWaterGoal(water.goal); }
        if (mealPrefs) setMealPlanPreferences(mealPrefs);
        // if (savedRecs.length) setSavedRecipes(savedRecs); // Not in current state, ignoring
        if (lastPlan) setMealPlan(lastPlan.plan);
      } catch (err) {
        console.error('Failed to load user data:', err);
      } finally {
        isInitialLoad.current = false;
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
  }, [dailyLog]);

  useEffect(() => {
    if (!isInitialLoad.current && userId) {
      const today = new Date().toISOString().split('T')[0];
      dbService.upsertWaterLog(userId, today, waterIntake, waterGoal).catch(console.error);
    }
  }, [waterIntake, waterGoal, userId]);

  useEffect(() => {
    if (!isInitialLoad.current && mealPlanPreferences && userId) {
      dbService.upsertMealPlanPreferences(userId, mealPlanPreferences).catch(console.error);
    }
  }, [mealPlanPreferences, userId]);

  useEffect(() => {
    if (!isInitialLoad.current && userId) {
      dbService.upsertUserProfile(userId, userProfile).catch(console.error);
    }
  }, [userProfile, userId]);

  useEffect(() => {
    if (!isInitialLoad.current && userId) {
      dbService.upsertSettings(userId, { ...appSettings, dietMode, goals: dailyGoals }).catch(console.error);
      if (appSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [appSettings, dietMode, dailyGoals, userId]);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setError(null);
  };
  
  const handleReset = () => {
    setImageFile(null);
    setImageUrl(null);
    setAnalysis(null);
    setError(null);
    setTextInput('');
    soundService.play('click');
  };

  const totals = useMemo(() => {
    return dailyLog.reduce((acc, item) => {
      acc.calories += item.nutrition.calories;
      acc.protein += item.nutrition.protein;
      acc.carbs += item.nutrition.carbs;
      acc.fat += item.nutrition.fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [dailyLog]);

  const remainingGoals = useMemo(() => {
    return {
      calories: Math.max(0, dailyGoals.calories - totals.calories),
      protein: Math.max(0, dailyGoals.protein - totals.protein),
      carbs: Math.max(0, dailyGoals.carbs - totals.carbs),
      fat: Math.max(0, dailyGoals.fat - totals.fat),
    };
  }, [dailyGoals, totals]);

  const handleAnalysis = useCallback(async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError(null);
    soundService.play('start');
    try {
      const result = await apiClient.analyzeImage(imageFile, remainingGoals, textInput);
      setAnalysis(result);
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
      }
      soundService.play('success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis. Please try again.');
      soundService.play('stop');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, textInput, remainingGoals]);

  const handleTextAnalysis = useCallback(async () => {
    if (!textInput.trim()) return;
    setIsLoading(true);
    setError(null);
    setImageFile(null);
    setImageUrl(null);
    soundService.play('start');
    try {
      const result = await apiClient.analyzeText(textInput, remainingGoals);
      setAnalysis(result);
      soundService.play('success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during text analysis. Please try rephrasing your description.');
      soundService.play('stop');
    } finally {
      setIsLoading(false);
    }
  }, [textInput, remainingGoals]);
  
  const handleAddLogItem = (item: AnalysisResult, url?: string) => {
    const tempId = new Date().toISOString();
    const newItem: DailyLogItem = {
      ...item,
      id: tempId,
      timestamp: new Date(),
      imageUrl: (item as any).imageUrl ?? url,
    };

    if (userId) {
      dbService.addLogEntry(userId, {
        foodName: item.foodName,
        nutrition: item.nutrition,
        alternatives: item.alternatives,
        detectedItems: item.detectedItems,
        imageUrl: (item as any).imageUrl ?? url,
      }).then(savedEntry => {
        setDailyLog(prevLog => prevLog.map(l => l.id === newItem.id ? savedEntry : l));
      }).catch(console.error);
    }

    setDailyLog(prevLog => [newItem, ...prevLog]);
    soundService.play('log');
    handleReset();
  };
  
  const handleAddManualMeal = (data: { foodName: string; nutrition: NutritionInfo }) => {
    const newItem: DailyLogItem = {
      id: new Date().toISOString(),
      timestamp: new Date(),
      foodName: data.foodName,
      nutrition: data.nutrition,
      alternatives: [],
      detectedItems: [],
    };

    if (userId) {
      dbService.addLogEntry(userId, {
        foodName: data.foodName,
        nutrition: data.nutrition,
        alternatives: [],
        detectedItems: [],
      }).then(savedEntry => {
        setDailyLog(prevLog => prevLog.map(l => l.id === newItem.id ? savedEntry : l));
      }).catch(console.error);
    }

    setDailyLog(prevLog => [newItem, ...prevLog]);
    setIsAddMealModalOpen(false);
    soundService.play('log');
  };

  const handleOpenEditModal = (item: DailyLogItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
    soundService.play('click');
  };

  const handleSaveEdit = (updatedItem: DailyLogItem) => {
    setDailyLog(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    if (userId) {
      dbService.updateLogEntry(userId, updatedItem.id, updatedItem.nutrition).catch(console.error);
    }
    setIsEditModalOpen(false);
    setEditingItem(null);
    soundService.play('success');
  };
  
  const handleDeleteItem = (itemId: string) => {
    const item = dailyLog.find(l => l.id === itemId);
    setDailyLog(prev => prev.filter(i => i.id !== itemId));
    soundService.play('stop');
    if (userId && item) {
      if (item.imageUrl) {
        import('./services/storageService').then(({ deleteFoodImage }) => {
          deleteFoodImage(item.imageUrl!);
        });
      }
      dbService.deleteLogEntry(userId, itemId).catch(console.error);
    }
  };
  
  const handleViewDetails = (item: DailyLogItem) => {
    setSelectedLogItem(item);
    setIsDetailModalOpen(true);
    soundService.play('click');
  };

  const handleDietModeChange = (mode: DietMode) => {
    setDietMode(mode);
    const newGoals = PRESET_GOALS[mode];
    setDailyGoals(newGoals);
    if (userId) {
      dbService.upsertSettings(userId, {
        ...appSettings, dietMode: mode, goals: newGoals
      }).catch(console.error);
    }
    soundService.play('click');
  };
  
  const handleUpdateGoals = (newGoals: NutritionInfo) => {
    setDailyGoals(newGoals);
    if (userId) {
      dbService.upsertSettings(userId, {
        ...appSettings, dietMode, goals: newGoals
      }).catch(console.error);
    }
    soundService.play('success');
  };

  const handleLogWater = (amount: number) => {
    setWaterIntake(prev => {
      const newAmount = Math.max(0, prev + amount);
      if (newAmount > prev) {
        soundService.play('water');
      } else {
        soundService.play('click');
      }
      return newAmount;
    });
  };

  const handleUpdateWaterGoal = (newGoal: number) => {
    setWaterGoal(newGoal);
    soundService.play('success');
  };
  
  const handleViewChange = (view: AppView) => {
    setActiveView(view);
    soundService.play('click');
  }

  const handleUpdateProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };
  
  const handleRecalculateGoals = (profile: UserProfile) => {
    let bmr: number;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        very: 1.725
    };

    const tdee = bmr * activityMultipliers[profile.activityLevel];
    
    const calories = Math.round(tdee);
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.40) / 4);
    const fat = Math.round((calories * 0.30) / 9);

    const newGoals: NutritionInfo = { calories, protein, carbs, fat };
    handleUpdateGoals(newGoals);
    alert(`Goals recalculated based on your profile! New daily calorie target: ${calories} kcal.`);
  };

  const handleUpdateSettings = (settings: AppSettings) => {
    setAppSettings(settings);
  };
  
  const handleExportData = () => {
    const dataToExport = {
      profile: userProfile,
      settings: appSettings,
      log: dailyLog,
      goals: dailyGoals,
      mealPlanPreferences: mealPlanPreferences,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nutrisnap_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    soundService.play('success');
  };

  const handleClearAllData = () => {
    setDailyLog([]);
    setWaterIntake(0);
    setAnalysis(null);
    setImageFile(null);
    setImageUrl(null);
    setIsClearDataConfirmOpen(false);
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    await auth.signOut();
    router.push('/login');
  };

  const analysisSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((analysis || error || isLoading) && analysisSectionRef.current) {
        analysisSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysis, error, isLoading]);

  const showAnalysisView = isLoading || error || analysis;
  
  const getHeaderTitle = () => {
    switch(activeView) {
      case 'dashboard': return 'NutriSnap';
      case 'analysis': return 'Deep Analysis';
      case 'mealPlan': return 'Meal Plan Generator';
      case 'profile': return 'User Profile';
      case 'settings': return 'Settings';
      default: return 'NutriSnap';
    }
  };

  return (
    <div className="min-h-screen font-sans">
      <SideMenu 
        isCollapsed={isMenuCollapsed}
        activeView={activeView}
        onToggle={() => {
            setIsMenuCollapsed(!isMenuCollapsed);
            soundService.play('click');
        }}
        onNavClick={handleViewChange}
        onHistoryClick={() => {
            setIsHistoryOpen(true);
            soundService.play('click');
        }}
        onReportClick={() => {
            setIsReportOpen(true);
            soundService.play('click');
        }}
        userName={userProfile.name}
        onSignOut={handleSignOut}
      />
      
      <div className={`transition-all duration-300 ease-in-out ${isMenuCollapsed ? 'pl-20' : 'pl-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-8">
              <h1 className="text-2xl font-bold text-slate-100 leading-tight">
                {getHeaderTitle()}
              </h1>
            </header>

            {activeView === 'dashboard' && (
              <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    {!imageUrl && !showAnalysisView && (
                        <ImageUploader 
                            onImageSelect={handleImageSelect} 
                            onTextSubmit={handleTextAnalysis}
                            textValue={textInput}
                            onTextChange={setTextInput}
                        />
                    )}

                    {imageUrl && !showAnalysisView && (
                        <div className="corner-box animate-fade-in" ref={analysisSectionRef}>
                            <div className="relative mb-4">
                                <img src={imageUrl} alt="Selected meal" className="w-full h-auto max-h-[450px] object-contain rounded-lg" />
                                <button onClick={handleReset} className="absolute top-3 right-3 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-2 rounded-full hover:bg-slate-800 hover:scale-110 transition-all" aria-label="Reset image">
                                    <ResetIcon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="mb-6">
                                <label htmlFor="mealDescription" className="block text-sm font-medium text-slate-400 mb-2">
                                    Add a description for more accuracy (optional)
                                </label>
                                <textarea
                                    id="mealDescription"
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="e.g., 'The chicken was grilled, not fried. The salad has a light vinaigrette.'"
                                    className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-400 focus:border-cyan-400 bg-slate-800 text-slate-200 placeholder-slate-500 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="text-center">
                                <button 
                                    onClick={handleAnalysis}
                                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg"
                                >
                                    Analyze Meal
                                </button>
                            </div>
                        </div>
                    )}

                    {showAnalysisView && (
                        <div className="corner-box animate-fade-in" ref={analysisSectionRef}>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center space-y-4 py-12">
                                    <Spinner />
                                    <p className="text-slate-300 font-semibold">Analyzing your meal...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 animate-shake ${error.includes('limit') ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                                        <div className={error.includes('limit') ? 'text-orange-400' : 'text-red-400'}>
                                            <ResetIcon className="w-5 h-5" />
                                        </div>
                                        <p className={`flex-grow font-medium ${error.includes('limit') ? 'text-orange-200' : 'text-red-200'}`}>{error}</p>
                                        <button onClick={handleReset} className="text-slate-400 hover:text-white transition-colors">
                                            <ResetIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleReset} 
                                        className="px-5 py-2.5 bg-cyan-500 text-white font-semibold rounded-full hover:bg-cyan-600 transition-all"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : analysis ? (
                               <>
                                {imageUrl ? (
                                    <div className="relative mb-6">
                                        <img src={imageUrl} alt="Uploaded meal" className="w-full h-auto max-h-[500px] object-contain rounded-lg" />
                                        {analysis.detectedItems.map((item, index) => {
                                          if (!item.boundingBox) return null;
                                          const [yMin, xMin, yMax, xMax] = item.boundingBox;
                                          return (
                                            <div 
                                              key={index}
                                              className="absolute border-2 border-cyan-400 rounded-md shadow-lg group"
                                              style={{
                                                top: `${yMin * 100}%`,
                                                left: `${xMin * 100}%`,
                                                width: `${(xMax - xMin) * 100}%`,
                                                height: `${(yMax - yMin) * 100}%`,
                                              }}
                                            >
                                              <div className="absolute -top-7 left-0 bg-cyan-400 text-slate-900 text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {item.foodName}: {Math.round(item.nutrition.calories)} kcal
                                              </div>
                                            </div>
                                          )
                                        })}
                                        <button onClick={handleReset} className="absolute top-3 right-3 bg-slate-900/50 backdrop-blur-sm text-slate-200 p-2 rounded-full hover:bg-slate-800 hover:scale-110 transition-all" aria-label="Reset image">
                                            <ResetIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-right mb-4">
                                         <button onClick={handleReset} className="bg-slate-800/50 text-slate-300 p-2 rounded-full hover:bg-slate-700 hover:scale-105 transition-all" aria-label="New Analysis">
                                            <ResetIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}

                                <NutritionDisplay analysis={analysis} />
                                <div className="mt-6 text-center">
                                    <button 
                                    onClick={() => handleAddLogItem(analysis, imageUrl || undefined)}
                                    className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg"
                                    >
                                    Log This Meal
                                    </button>
                                </div>
                                <div className="mt-8">
                                    <h4 className="text-xl font-bold text-slate-200 mb-3 flex items-center gap-2">
                                        <LightbulbIcon className="w-5 h-5 shrink-0 text-yellow-300" aria-hidden />
                                        <span>Healthier Alternatives</span>
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                                        {analysis.alternatives.map((alt, index) => <li key={index}>{alt}</li>)}
                                    </ul>
                                </div>
                               </>
                            ) : null}
                        </div>
                    )}
                  </div>

                  <aside className="lg:col-span-1">
                  <DailyTracker 
                      dailyLog={dailyLog}
                      totals={totals}
                      goals={dailyGoals}
                      onEdit={handleOpenEditModal}
                      onViewDetails={handleViewDetails}
                      onUpdateGoals={handleUpdateGoals}
                      dietMode={dietMode}
                      onDietModeChange={handleDietModeChange}
                      onAddMealClick={() => {
                          setIsAddMealModalOpen(true);
                          soundService.play('click');
                      }}
                      waterIntake={waterIntake}
                      waterGoal={waterGoal}
                      onLogWater={handleLogWater}
                      onUpdateWaterGoal={handleUpdateWaterGoal}
                  />
                  </aside>
              </main>
            )}

            {activeView === 'analysis' && (
              <DeepAnalysisPage log={dailyLog} goals={dailyGoals} />
            )}

            {activeView === 'mealPlan' && (
              <MealPlanGeneratorPage 
                preferences={mealPlanPreferences}
                goals={dailyGoals}
                onSavePreferences={setMealPlanPreferences}
                mealPlan={mealPlan}
                onPlanGenerated={setMealPlan}
              />
            )}

            {activeView === 'profile' && (
                <ProfilePage 
                    profile={userProfile}
                    settings={appSettings}
                    onSaveProfile={handleUpdateProfile}
                    onRecalculateGoals={handleRecalculateGoals}
                />
            )}
            
            {activeView === 'settings' && (
                <SettingsPage 
                    settings={appSettings}
                    onUpdateSettings={handleUpdateSettings}
                    onExportData={handleExportData}
                    onClearData={() => setIsClearDataConfirmOpen(true)}
                    onSignOut={handleSignOut}
                />
            )}
        </div>
      </div>

      {isEditModalOpen && editingItem && (
        <EditLogModal 
          item={editingItem}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}
      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        log={dailyLog}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteItem}
        onViewDetails={handleViewDetails}
      />
      <AddMealModal 
        isOpen={isAddMealModalOpen}
        onClose={() => setIsAddMealModalOpen(false)}
        onSave={handleAddManualMeal}
      />
      <WeeklyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        log={dailyLog}
        goals={dailyGoals}
      />
      {isDetailModalOpen && selectedLogItem && (
        <MealDetailModal
          item={selectedLogItem}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
      <ConfirmationModal
        isOpen={isClearDataConfirmOpen}
        onClose={() => setIsClearDataConfirmOpen(false)}
        onConfirm={handleClearAllData}
        title="Clear All Data?"
        message="This action is irreversible. All your logged meals, goals, and preferences will be permanently deleted."
      />

    </div>
  );
};

export default App;