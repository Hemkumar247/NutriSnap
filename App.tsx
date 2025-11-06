import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { SideMenu } from './components/SideMenu';
import { ImageUploader } from './components/ImageUploader';
import { NutritionDisplay } from './components/NutritionDisplay';
import { DailyTracker } from './components/DailyTracker';
import { analyzeMeal, getChatResponse } from './services/geminiService';
import type { AnalysisResult, DailyLogItem, NutritionInfo, ChatMessage, ChatContext, AppView } from './types';
import { Spinner } from './components/Spinner';
import { ResetIcon, LightbulbIcon, BrandLogoIcon } from './components/IconComponents';
import { EditLogModal } from './components/EditLogModal';
import { ChatButton } from './components/ChatButton';
import { ChatAssistant } from './components/ChatAssistant';
import { HistoryModal } from './components/HistoryModal';
import { AddMealModal } from './components/AddMealModal';
import { WeeklyReportModal } from './components/WeeklyReportModal';
import { MealDetailModal } from './components/MealDetailModal';
import { soundService } from './services/soundService';
import { DeepAnalysisPage } from './components/DeepAnalysisPage';


type DietMode = 'maintenance' | 'loss' | 'gain';

const PRESET_GOALS: Record<DietMode, NutritionInfo> = {
  maintenance: { calories: 2000, protein: 120, carbs: 250, fat: 65 },
  loss: { calories: 1600, protein: 130, carbs: 150, fat: 55 },
  gain: { calories: 2500, protein: 150, carbs: 300, fat: 80 },
};

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [mealDescription, setMealDescription] = useState<string>('');
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
  
  // Water intake state
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoal] = useState<number>(2500); // Default 2.5L

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', content: "Hello! I'm NutriSnap AI. How can I help you with your nutrition today? Ask me about your goals, logged meals, or for meal ideas!" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  
  // Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  
  // Side Menu State
  const [isMenuCollapsed, setIsMenuCollapsed] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<AppView>('dashboard');


  // Load data from localStorage on initial render
  useEffect(() => {
    try {
      // Load Food Log
      const savedLog = localStorage.getItem('nutrisnap_log');
      if (savedLog) {
        const parsedLog = JSON.parse(savedLog).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setDailyLog(parsedLog);
      }

      // Load Water Intake (and reset if it's a new day)
      const savedWater = localStorage.getItem('nutrisnap_water');
      if (savedWater) {
        const { intake, date, goal } = JSON.parse(savedWater);
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          setWaterIntake(intake);
          setWaterGoal(goal || 2500);
        } else {
          // It's a new day, reset water intake
          localStorage.removeItem('nutrisnap_water');
        }
      }

      // Load Diet Mode
      const savedMode = localStorage.getItem('nutrisnap_diet_mode') as DietMode | null;
      if (savedMode && ['maintenance', 'loss', 'gain'].includes(savedMode)) {
        setDietMode(savedMode);
        setDailyGoals(PRESET_GOALS[savedMode]);
      }
      
      // Load Custom Goals
      const savedGoals = localStorage.getItem('nutrisnap_custom_goals');
      if (savedGoals) {
        setDailyGoals(JSON.parse(savedGoals));
      }

    } catch (e) {
      console.error("Failed to load data from localStorage", e);
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nutrisnap_log', JSON.stringify(dailyLog));
    } catch (e) {
      console.error("Failed to save log to localStorage", e);
    }
  }, [dailyLog]);

  useEffect(() => {
    try {
      const waterData = {
        intake: waterIntake,
        goal: waterGoal,
        date: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem('nutrisnap_water', JSON.stringify(waterData));
    } catch (e) {
      console.error("Failed to save water intake to localStorage", e);
    }
  }, [waterIntake, waterGoal]);


  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setAnalysis(null);
    setError(null);
  };
  
  const handleMealDescriptionChange = (description: string) => {
    setMealDescription(description);
  };
  
  const handleReset = () => {
    setImageFile(null);
    setImageUrl(null);
    setAnalysis(null);
    setError(null);
    setMealDescription('');
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
      const result = await analyzeMeal(imageFile, remainingGoals, mealDescription);
      setAnalysis(result);
      soundService.play('success');
    } catch (err: any) {
      const errorMessage = (err.message || '').toLowerCase();
      if (errorMessage.includes('parse') || errorMessage.includes('json')) {
        setError("The AI had trouble analyzing the meal's photo. This can happen with unusual angles or lighting. Please try again with a clearer picture.");
      } else if (errorMessage.includes('api key')) { // Catch potential API key issues
        setError("There seems to be a configuration issue. Please contact support.");
      } else {
        setError('An unexpected error occurred during analysis. Please check your connection and try again.');
      }
      soundService.play('stop');
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, remainingGoals, mealDescription]);
  
  const handleAddLogItem = (item: AnalysisResult, url?: string) => {
    const newItem: DailyLogItem = {
      ...item,
      id: new Date().toISOString(),
      timestamp: new Date(),
      imageUrl: url,
    };
    setDailyLog(prevLog => [newItem, ...prevLog]);
    soundService.play('log');
    handleReset(); // Clear the analysis section after logging
  };
  
  const handleAddManualMeal = (data: { foodName: string; nutrition: NutritionInfo }) => {
    const newMeal: DailyLogItem = {
      id: new Date().toISOString(),
      timestamp: new Date(),
      foodName: data.foodName,
      nutrition: data.nutrition,
      alternatives: [],
      detectedItems: [],
    };
    setDailyLog(prevLog => [newMeal, ...prevLog]);
    setIsAddMealModalOpen(false);
    soundService.play('log');
  };

  // Edit/Delete handlers
  const handleOpenEditModal = (item: DailyLogItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
    soundService.play('click');
  };

  const handleSaveEdit = (updatedItem: DailyLogItem) => {
    setDailyLog(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    setIsEditModalOpen(false);
    setEditingItem(null);
    soundService.play('success');
  };
  
  const handleDeleteItem = (itemId: string) => {
    setDailyLog(prev => prev.filter(item => item.id !== itemId));
    soundService.play('stop');
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
    localStorage.setItem('nutrisnap_diet_mode', mode);
    localStorage.removeItem('nutrisnap_custom_goals'); // Remove custom goals when preset is chosen
    soundService.play('click');
  };
  
  const handleUpdateGoals = (newGoals: NutritionInfo) => {
    setDailyGoals(newGoals);
    localStorage.setItem('nutrisnap_custom_goals', JSON.stringify(newGoals));
    soundService.play('success');
    // If goals are custom, diet mode might not match a preset.
    // We could set it to 'maintenance' or a new 'custom' state.
    // For now, let's just update the goals.
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
  
  const chatContext: ChatContext = useMemo(() => ({
    goals: dailyGoals,
    totals: totals,
    log: dailyLog,
    waterIntake,
    waterGoal
  }), [dailyGoals, totals, dailyLog, waterIntake, waterGoal]);


  const handleSendMessage = useCallback(async (message: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    setIsChatLoading(true);

    try {
      const { text, sources } = await getChatResponse(message, chatContext);
      setChatHistory(prev => [...prev, { role: 'model', content: text, sources }]);
      soundService.play('received');
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please try again." }]);
      soundService.play('stop');
    } finally {
      setIsChatLoading(false);
    }
  }, [chatContext]);

  const handleAddLiveChatTurn = useCallback((userMessage: string, modelMessage: string) => {
    if (!userMessage && !modelMessage) return;
    const newMessages: ChatMessage[] = [];
    if (userMessage) newMessages.push({ role: 'user', content: userMessage });
    if (modelMessage) newMessages.push({ role: 'model', content: modelMessage });
    
    setChatHistory(prev => [...prev, ...newMessages]);
  }, []);
  
  const handleViewChange = (view: AppView) => {
    setActiveView(view);
    soundService.play('click');
  }

  const analysisSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (analysis && analysisSectionRef.current) {
      analysisSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysis]);
  

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
      />
      
      <div className={`transition-all duration-300 ease-in-out ${isMenuCollapsed ? 'pl-20' : 'pl-64'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="flex items-center mb-8">
              <BrandLogoIcon className="h-9 w-9 text-cyan-400 mr-3" />
              <h1 className="text-2xl font-bold text-slate-100">
                {activeView === 'dashboard' ? 'NutriSnap AI' : 'Deep Analysis'}
              </h1>
            </header>

            {activeView === 'dashboard' && (
              <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                  {/* Uploader */}
                  {!imageUrl && <ImageUploader onImageSelect={handleImageSelect} />}

                  {/* Analysis Display */}
                  {imageUrl && (
                      <div className="corner-box animate-fade-in" ref={analysisSectionRef}>
                      <div className="relative">
                          <img src={imageUrl} alt="Uploaded meal" className="w-full h-auto max-h-[500px] object-contain rounded-lg" />
                          
                          {/* Bounding Boxes */}
                          {analysis && analysis.detectedItems.map((item, index) => {
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

                      {/* Meal Description Input */}
                      {!analysis && !isLoading && (
                        <div className="mt-4">
                              <label htmlFor="mealDescription" className="block text-sm font-medium text-slate-400 mb-1">
                                  Optional: Add a description for better accuracy
                              </label>
                              <input
                                  type="text"
                                  id="mealDescription"
                                  value={mealDescription}
                                  onChange={(e) => handleMealDescriptionChange(e.target.value)}
                                  placeholder="e.g., 'My lunch with grilled chicken and quinoa'"
                                  className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-400 focus:border-cyan-400 bg-slate-800 text-slate-200 placeholder-slate-500"
                              />
                          </div>
                      )}

                      {/* Analysis Button & Result */}
                      {isLoading ? (
                          <div className="flex flex-col items-center justify-center space-y-4 py-12">
                              <Spinner />
                              <p className="text-slate-300 font-semibold">Analyzing your meal...</p>
                          </div>
                      ) : error ? (
                          <div className="text-center py-8">
                              <p className="text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg">{error}</p>
                              <button 
                                  onClick={handleAnalysis} 
                                  className="px-5 py-2.5 bg-cyan-500 text-white font-semibold rounded-full hover:bg-cyan-600 transition-all"
                              >
                                  Try Again
                              </button>
                          </div>
                      ) : analysis ? (
                          <>
                          <NutritionDisplay analysis={analysis} />
                          <div className="mt-6 text-center">
                              <button 
                              onClick={() => handleAddLogItem(analysis, imageUrl)}
                              className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg"
                              >
                              Log This Meal
                              </button>
                          </div>
                          <div className="mt-8">
                              <h4 className="text-xl font-bold text-slate-200 mb-3 flex items-center">
                                  <LightbulbIcon className="w-5 h-5 mr-2 text-yellow-300" />
                                  Healthier Alternatives
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                                  {analysis.alternatives.map((alt, index) => <li key={index}>{alt}</li>)}
                              </ul>
                          </div>
                          </>
                      ) : (
                          <div className="text-center mt-6">
                              <button 
                                  onClick={handleAnalysis} 
                                  className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-purple-500 to-cyan-400 text-white font-bold rounded-full hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-lg"
                              >
                                  Analyze Now
                              </button>
                          </div>
                      )}
                      </div>
                  )}
                  </div>

                  {/* Right Sidebar - Daily Tracker */}
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
        </div>
      </div>

       {/* Modals */}
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

      {/* Floating Action Button for Chat */}
      <ChatButton onClick={() => {
        setIsChatOpen(true);
        soundService.play('start');
      }} />

      {/* Chat Assistant Modal */}
      <ChatAssistant 
        isOpen={isChatOpen}
        onClose={() => {
            setIsChatOpen(false);
            soundService.play('stop');
        }}
        messages={chatHistory}
        onSendMessage={handleSendMessage}
        onAddLiveTurn={handleAddLiveChatTurn}
        isLoading={isChatLoading}
        chatContext={chatContext}
      />
    </div>
  );
};

export default App;
