'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import * as dbService from '@/services/dbService';
import * as apiClient from '@/services/apiClient';
import * as storageService from '@/services/storageService';

import { SideMenu } from '@/components/SideMenu';
import { ImageUploader } from '@/components/ImageUploader';
import { NutritionDisplay } from '@/components/NutritionDisplay';
import { DailyTracker } from '@/components/DailyTracker';
import type { 
    AnalysisResult, 
    DailyLogItem, 
    NutritionInfo, 
    AppView, 
    MealPlanPreferences, 
    MealPlan, 
    UserProfile, 
    AppSettings 
} from '@/types';
import { Spinner } from '@/components/Spinner';
import { ResetIcon, LightbulbIcon } from '@/components/IconComponents';
import { EditLogModal } from '@/components/EditLogModal';
import { HistoryModal } from '@/components/HistoryModal';
import { AddMealModal } from '@/components/AddMealModal';
import { WeeklyReportModal } from '@/components/WeeklyReportModal';
import { MealDetailModal } from '@/components/MealDetailModal';
import { soundService } from '@/services/soundService';
import { DeepAnalysisPage } from '@/components/DeepAnalysisPage';
import { MealPlanGeneratorPage } from '@/components/MealPlanGeneratorPage';
import { ProfilePage } from '@/components/ProfilePage';
import { SettingsPage } from '@/components/SettingsPage';
import { ConfirmationModal } from '@/components/ConfirmationModal';

type DietMode = 'maintenance' | 'loss' | 'gain';

const PRESET_GOALS: Record<DietMode, NutritionInfo> = {
  maintenance: { calories: 2000, protein: 120, carbs: 250, fat: 65 },
  loss: { calories: 1600, protein: 130, carbs: 150, fat: 55 },
  gain: { calories: 2500, protein: 150, carbs: 300, fat: 80 },
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  age: 30,
  gender: 'male',
  height: 175,
  weight: 70,
  activityLevel: 'moderate'
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  units: 'metric'
};

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DailyLogItem | null>(null);
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedLogItem, setSelectedLogItem] = useState<DailyLogItem | null>(null);

  const [dietMode, setDietMode] = useState<DietMode>('maintenance');
  const [dailyGoals, setDailyGoals] = useState<NutritionInfo>(PRESET_GOALS.maintenance);
  
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(2500);

  
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  
  const [isMenuCollapsed, setIsMenuCollapsed] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  const [mealPlanPreferences, setMealPlanPreferences] = useState<MealPlanPreferences | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isMounted, setIsMounted] = useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const analysisSectionRef = useRef<HTMLDivElement>(null);

  // Authenticated Data Loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.uid);

      const today = new Date().toISOString().split('T')[0];
      try {
        const [log, settings, profile, water, mealPrefs, lastPlan] = await Promise.all([
          dbService.getTodayLog(user.uid),
          dbService.getSettings(user.uid),
          dbService.getUserProfile(user.uid),
          dbService.getWaterLog(user.uid, today),
          dbService.getMealPlanPreferences(user.uid),
          dbService.getLastMealPlan(user.uid),
        ]);

        if (log.length) setDailyLog(log);
        if (settings) {
          setAppSettings({ theme: settings.theme, units: settings.units });
          setDietMode(settings.dietMode as any);
          setDailyGoals(settings.goals);
          document.documentElement.className = settings.theme;
        } else {
          // Set initial defaults in Firestore if new user
          await dbService.upsertSettings(user.uid, { ...DEFAULT_SETTINGS, dietMode: 'maintenance', goals: PRESET_GOALS.maintenance });
        }
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // Use Firebase display name if available
          const initialProfile = { ...DEFAULT_PROFILE, name: user.displayName || 'User' };
          await dbService.upsertUserProfile(user.uid, initialProfile);
          setUserProfile(initialProfile);
        }

        if (water) { 
          setWaterIntake(water.intake); 
          setWaterGoal(water.goal); 
        }
        if (mealPrefs) setMealPlanPreferences(mealPrefs);
        if (lastPlan) setMealPlan(lastPlan.plan);
      } catch (err) {
        console.error('Failed to load user data:', err);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Handle on-demand view data loading
  useEffect(() => {
    if (activeView === 'analysis' && userId) {
      dbService.getMonthlyLog(userId)
        .then(monthLog => setDailyLog(monthLog))
        .catch(console.error);
    }
  }, [activeView, userId]);

  useEffect(() => {
    if (activeView === 'mealPlan' && userId) {
      dbService.getLastMealPlan(userId)
        .then(saved => {
          if (saved) {
            setMealPlan(saved.plan);
            setMealPlanPreferences(saved.preferences);
          }
        })
        .catch(console.error);
    }
  }, [activeView, userId]);


  // Handlers
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
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

  const handleAnalysis = useCallback(async () => {
    if (!imageFile) return;
    setIsLoading(true);
    setError(null);
    soundService.play('start');
    try {
      const result = await apiClient.analyzeMeal(imageFile, remainingGoals, textInput);
      setAnalysis(result);
      soundService.play('success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
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
      const result = await apiClient.analyzeMealFromText(textInput, remainingGoals);
      setAnalysis(result);
      soundService.play('success');
    } catch (err: any) {
      setError('An unexpected error occurred during text analysis.');
      soundService.play('stop');
    } finally {
      setIsLoading(false);
    }
  }, [textInput, remainingGoals]);

  const handleOpenEditModal = (item: DailyLogItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
    soundService.play('click');
  };

  const handleViewDetails = (item: DailyLogItem) => {
    setSelectedLogItem(item);
    setIsDetailModalOpen(true);
    soundService.play('click');
  };

  const handleAddLogItem = async () => {
    if (!userId || !analysis) return;
    try {
      const newEntry = await dbService.addLogEntry(userId, {
        foodName: analysis.foodName,
        nutrition: analysis.nutrition,
        alternatives: analysis.alternatives,
        detectedItems: analysis.detectedItems,
        imageUrl: (analysis as any).imageUrl, // present for image analysis, undefined for text
      });
      
      setDailyLog(prev => [newEntry, ...prev]);
      soundService.play('log');
      handleReset();
    } catch (err) {
      console.error('Failed to add log entry:', err);
    }
  };
  
  const handleAddManualMeal = async (data: { foodName: string; nutrition: NutritionInfo }) => {
    if (!userId) return;
    try {
        const addedItem = await dbService.addLogEntry(userId, {
            foodName: data.foodName,
            nutrition: data.nutrition,
            alternatives: [],
            detectedItems: []
        });
        setDailyLog(prev => [addedItem, ...prev]);
        setIsAddMealModalOpen(false);
        soundService.play('log');
    } catch (err) {
        console.error('Failed to add manual meal:', err);
    }
  };

  const handleSaveEdit = async (updatedItem: DailyLogItem) => {
    if (!userId) return;
    try {
      await dbService.updateLogEntry(userId, updatedItem.id, updatedItem);
      setDailyLog(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      setIsEditModalOpen(false);
      setEditingItem(null);
      soundService.play('success');
    } catch (err) {
      console.error('Failed to update log entry:', err);
    }
  };
  
  const handleDeleteItem = async (itemId: string) => {
    if (!userId) return;
    try {
      const itemToDelete = dailyLog.find(i => i.id === itemId);
      if (itemToDelete?.imageUrl) {
        storageService.deleteFoodImage(itemToDelete.imageUrl); // fire and forget
      }
      
      await dbService.deleteLogEntry(userId, itemId);
      setDailyLog(prev => prev.filter(item => item.id !== itemId));
      soundService.play('stop');
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  const handleDietModeChange = async (mode: DietMode) => {
    if (!userId) return;
    const newGoals = PRESET_GOALS[mode];
    setDietMode(mode);
    setDailyGoals(newGoals);
    await dbService.upsertSettings(userId, { ...appSettings, dietMode: mode, goals: newGoals });
    soundService.play('click');
  };
  
  const handleUpdateGoals = async (newGoals: NutritionInfo) => {
    if (!userId) return;
    setDailyGoals(newGoals);
    await dbService.upsertSettings(userId, { ...appSettings, dietMode, goals: newGoals });
    soundService.play('success');
  };

  const handleLogWater = async (amount: number) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    const newIntake = Math.max(0, waterIntake + amount);
    setWaterIntake(newIntake);
    await dbService.upsertWaterLog(userId, today, newIntake, waterGoal);
    if (amount > 0) soundService.play('water');
    else soundService.play('click');
  };

  const handleUpdateWaterGoal = async (newGoal: number) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    setWaterGoal(newGoal);
    await dbService.upsertWaterLog(userId, today, waterIntake, newGoal);
    soundService.play('success');
  };




  const handleUpdateProfile = async (profile: UserProfile) => {
    if (!userId) return;
    setUserProfile(profile);
    await dbService.upsertUserProfile(userId, profile);
  };
  
  const handleRecalculateGoals = (profile: UserProfile) => {
    let bmr: number;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }
    const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
    const tdee = bmr * activityMultipliers[profile.activityLevel];
    const calories = Math.round(tdee);
    const protein = Math.round((calories * 0.30) / 4);
    const carbs = Math.round((calories * 0.40) / 4);
    const fat = Math.round((calories * 0.30) / 9);
    handleUpdateGoals({ calories, protein, carbs, fat });
  };

  const handleUpdateSettings = async (settings: AppSettings) => {
    if (!userId) return;
    setAppSettings(settings);
    await dbService.upsertSettings(userId, { ...settings, dietMode, goals: dailyGoals });
    document.documentElement.className = settings.theme;
  };
  
  const handleExportData = () => {
    const dataToExport = { profile: userProfile, settings: appSettings, log: dailyLog, goals: dailyGoals, mealPlanPreferences };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `nutrisnap_data_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    soundService.play('success');
  };

  const handleClearAllData = async () => {
    // This function will need a more complex implementation to clear subcollections in Firestore
    // For now, we reset local state and provide a hint
    setDailyLog([]);
    setWaterIntake(0);
    setMealPlanPreferences(null);
    setMealPlan(null);
    setDailyGoals(PRESET_GOALS.maintenance);
    setDietMode('maintenance');
    setUserProfile(DEFAULT_PROFILE);
    setAppSettings(DEFAULT_SETTINGS);
    setIsClearDataConfirmOpen(false);
    alert('Please contact support to fully purge your cloud data.');
  };

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

  if (!isMounted) return null;

  return (
    <div className="min-h-screen font-sans relative overflow-hidden">
      {/* Ambient Background Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10">
      <SideMenu 
        isCollapsed={isMenuCollapsed}
        activeView={activeView}
        onToggle={() => {
            setIsMenuCollapsed(!isMenuCollapsed);
            soundService.play('click');
        }}
        onNavClick={(view) => { setActiveView(view); soundService.play('click'); }}
        onHistoryClick={() => { 
            setIsHistoryOpen(true); 
            soundService.play('click');
            if (userId) {
              dbService.getFullHistory(userId, 100)
                .then(({ data }) => setDailyLog(data))
                .catch(console.error);
            }
        }}
        onReportClick={() => { 
            setIsReportOpen(true); 
            soundService.play('click');
            if (userId) {
              dbService.getWeeklyLog(userId)
                .then(weekLog => setDailyLog(weekLog))
                .catch(console.error);
            }
        }}
        userName={userProfile.name}
      />
      
      <div className={`transition-all duration-300 ease-in-out ${isMenuCollapsed ? 'pl-20' : 'pl-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-8 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-100 leading-tight">
                {getHeaderTitle()}
              </h1>
              <button 
                onClick={handleSignOut}
                className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-red-400 transition-colors"
              >
                Sign Out
              </button>
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
                                    <p className="text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>
                                    <button onClick={handleReset} className="px-5 py-2.5 bg-cyan-500 text-white font-semibold rounded-full hover:bg-cyan-600 transition-all">
                                        Try Again
                                    </button>
                                </div>
                            ) : analysis ? (
                               <>
                                <div className="relative mb-6">
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Uploaded meal" className="w-full h-auto max-h-[500px] object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-full aspect-video bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-500 italic">
                                            Analysis from text description
                                        </div>
                                    )}
                                    {analysis.detectedItems.map((item, index) => {
                                      if (!item.boundingBox) return null;
                                      const [yMin, xMin, yMax, xMax] = item.boundingBox;
                                      return (
                                        <div key={index} className="absolute border-2 border-cyan-400 rounded-md shadow-lg group"
                                          style={{ top: `${yMin * 100}%`, left: `${xMin * 100}%`, width: `${(xMax - xMin) * 100}%`, height: `${(yMax - yMin) * 100}%` }}>
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
                                <NutritionDisplay analysis={analysis} />
                                <div className="mt-6 text-center">
                                    <button 
                                        onClick={handleAddLogItem}
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
                      onAddMealClick={() => { setIsAddMealModalOpen(true); soundService.play('click'); }}
                      waterIntake={waterIntake}
                      waterGoal={waterGoal}
                      onLogWater={handleLogWater}
                      onUpdateWaterGoal={handleUpdateWaterGoal}
                  />
                  </aside>
              </main>
            )}

            {activeView === 'analysis' && <DeepAnalysisPage log={dailyLog} goals={dailyGoals} />}

            {activeView === 'mealPlan' && (
              <MealPlanGeneratorPage 
                preferences={mealPlanPreferences}
                goals={dailyGoals}
                onSavePreferences={async (prefs) => {
                    if (!userId) return;
                    setMealPlanPreferences(prefs);
                    await dbService.upsertMealPlanPreferences(userId, prefs);
                }}
                mealPlan={mealPlan}
                onPlanGenerated={async (plan) => {
                    if (!userId || !mealPlanPreferences) return;
                    setMealPlan(plan);
                    dbService.saveMealPlan(userId, mealPlanPreferences, plan)
                      .catch(console.error);
                }}
              />
            )}

            {activeView === 'profile' && <ProfilePage profile={userProfile} settings={appSettings} onSaveProfile={handleUpdateProfile} onRecalculateGoals={handleRecalculateGoals} />}
            
            {activeView === 'settings' && (
                <SettingsPage 
                    settings={appSettings}
                    onUpdateSettings={handleUpdateSettings}
                    onExportData={handleExportData}
                    onClearData={() => setIsClearDataConfirmOpen(true)}
                />
            )}
        </div>
      </div>

       {/* Modals & Chat */}
      {isEditModalOpen && editingItem && <EditLogModal item={editingItem} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveEdit} />}
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} log={dailyLog} onEdit={handleOpenEditModal} onDelete={handleDeleteItem} onViewDetails={handleViewDetails} />
      <AddMealModal isOpen={isAddMealModalOpen} onClose={() => setIsAddMealModalOpen(false)} onSave={handleAddManualMeal} />
      <WeeklyReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} log={dailyLog} goals={dailyGoals} />
      {isDetailModalOpen && selectedLogItem && <MealDetailModal item={selectedLogItem} onClose={() => setIsDetailModalOpen(false)} />}
      <ConfirmationModal isOpen={isClearDataConfirmOpen} onClose={() => setIsClearDataConfirmOpen(false)} onConfirm={handleClearAllData} title="Clear All Data?" message="This action is irreversible. All your logged meals, goals, and preferences will be permanently deleted." />
      </div>
    </div>
  );
};

export default DashboardPage;
