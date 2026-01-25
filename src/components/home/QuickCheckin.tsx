import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { useCriticalPsychologyMetrics, CriticalMetric } from '@/hooks/useCriticalPsychologyMetrics';
import { toast } from 'sonner';
import { Check, RefreshCw, Wind, Heart, Sparkles, Moon, Zap, Brain, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const moods = [
  { emoji: '😢', label: 'Triste', value: 1 },
  { emoji: '😔', label: 'Giù', value: 2 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '🙂', label: 'Bene', value: 4 },
  { emoji: '😄', label: 'Ottimo', value: 5 },
];

const anxietyLevels = [
  { icon: '🧘', label: 'Zen', value: 1, color: 'bg-emerald-500' },
  { icon: '😌', label: 'Calmo', value: 2, color: 'bg-emerald-400' },
  { icon: '😊', label: 'Ok', value: 3, color: 'bg-amber-400' },
  { icon: '😟', label: 'Teso', value: 4, color: 'bg-orange-400' },
  { icon: '😰', label: 'Panico', value: 5, color: 'bg-red-500' },
];

const energyLevels = [
  { icon: '🪫', label: 'Esausto', value: 1 },
  { icon: '🔋', label: 'Bassa', value: 2 },
  { icon: '⚡', label: 'Media', value: 3 },
  { icon: '⚡⚡', label: 'Alta', value: 4 },
  { icon: '🔥', label: 'Carico', value: 5 },
];

const sleepLevels = [
  { icon: '😵', label: 'Pessimo', value: 1 },
  { icon: '😴', label: 'Male', value: 2 },
  { icon: '🌙', label: 'Ok', value: 3 },
  { icon: '💤', label: 'Bene', value: 4 },
  { icon: '⭐', label: 'Ottimo', value: 5 },
];

// Generic 1-10 scale for psychology metrics
const genericScale = [
  { icon: '1', label: 'Min', value: 1 },
  { icon: '3', label: 'Basso', value: 3 },
  { icon: '5', label: 'Medio', value: 5 },
  { icon: '7', label: 'Alto', value: 7 },
  { icon: '10', label: 'Max', value: 10 },
];

const motivationalPhrases = [
  "Ogni giorno è un nuovo inizio.",
  "Piccoli passi portano a grandi cambiamenti.",
  "Sei più forte di quanto pensi.",
  "Prenditi cura di te stesso oggi.",
  "Respira, sei nel posto giusto.",
  "Il tuo benessere è importante.",
  "Oggi è un buon giorno per stare bene.",
  "Una conversazione può cambiare tutto.",
  "Ascoltati, meriti attenzione.",
  "La calma è una superpotenza.",
  "Celebra i piccoli progressi.",
  "Sei sulla strada giusta.",
];

type CheckinStep = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'psychology' | 'complete';

const stepLabels: Record<string, string> = {
  mood: 'Come ti senti?',
  anxiety: 'Livello di ansia?',
  energy: 'Quanta energia hai?',
  sleep: 'Come hai dormito?',
};

// Base quick actions
const BASE_QUICK_ACTIONS = [
  { key: 'mood', icon: Heart, label: 'Umore', color: 'text-rose-500', bgCompleted: 'bg-rose-50' },
  { key: 'anxiety', icon: Brain, label: 'Ansia', color: 'text-violet-500', bgCompleted: 'bg-violet-50' },
  { key: 'energy', icon: Zap, label: 'Energia', color: 'text-amber-500', bgCompleted: 'bg-amber-50' },
  { key: 'sleep', icon: Moon, label: 'Sonno', color: 'text-indigo-500', bgCompleted: 'bg-indigo-50' },
] as const;

interface QuickCheckinProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number) => void;
}

const QuickCheckin: React.FC<QuickCheckinProps> = ({ selectedMood, onMoodSelect }) => {
  const { user } = useAuth();
  const { todayCheckin, weeklyCheckins, saveCheckin } = useCheckins();
  const { profile } = useProfile();
  const { prioritizedSlots, criticalMetrics } = useCriticalPsychologyMetrics();
  
  const [currentStep, setCurrentStep] = useState<CheckinStep>('mood');
  const [moodValue, setMoodValue] = useState<number | null>(null);
  const [anxietyValue, setAnxietyValue] = useState<number | null>(null);
  const [energyValue, setEnergyValue] = useState<number | null>(null);
  const [sleepValue, setSleepValue] = useState<number | null>(null);
  const [isCheckinComplete, setIsCheckinComplete] = useState(false);
  const [showQuickButtons, setShowQuickButtons] = useState(true);
  const [currentPsychMetric, setCurrentPsychMetric] = useState<CriticalMetric | null>(null);

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.name?.split(' ')[0] || '';
    const nameStr = name ? ` ${name}` : '';
    
    if (hour < 6) return `Notte fonda${nameStr}...`;
    if (hour < 12) return `Buongiorno${nameStr}!`;
    if (hour < 14) return `Buon pranzo${nameStr}!`;
    if (hour < 18) return `Buon pomeriggio${nameStr}!`;
    if (hour < 21) return `Buonasera${nameStr}!`;
    return `Buonanotte${nameStr}!`;
  };

  // Daily motivational phrase
  const motivationalPhrase = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return motivationalPhrases[dayOfYear % motivationalPhrases.length];
  }, []);

  // Weekly sparkline data
  const sparklineData = useMemo(() => {
    if (!weeklyCheckins || weeklyCheckins.length === 0) return [];
    return weeklyCheckins.map(c => ({ value: c.mood_value * 2 }));
  }, [weeklyCheckins]);

  // Check completed status for each metric
  const completedMetrics = useMemo(() => {
    const completed = { mood: false, anxiety: false, energy: false, sleep: false };
    
    if (todayCheckin) {
      completed.mood = true;
      
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          if (notes.anxiety) completed.anxiety = true;
          if (notes.energy) completed.energy = true;
          if (notes.sleep) completed.sleep = true;
        } catch (e) {
          // Notes not in JSON format
        }
      }
    }
    
    return completed;
  }, [todayCheckin]);

  const allBaseCompleted = Object.values(completedMetrics).every(Boolean);

  // BUILD DYNAMIC QUICK ACTIONS based on completion status
  const dynamicQuickActions = useMemo(() => {
    type QuickAction = {
      key: string;
      icon: typeof Heart;
      label: string;
      color: string;
      bgCompleted: string;
      isPsychology: boolean;
      psychMetric: CriticalMetric | null;
      emoji?: string;
    };

    // If base metrics not complete, show them
    if (!allBaseCompleted) {
      return BASE_QUICK_ACTIONS.map(action => ({
        ...action,
        isPsychology: false,
        psychMetric: null as CriticalMetric | null,
      })) as QuickAction[];
    }

    // All base complete: show psychology metrics with priority
    const slots: QuickAction[] = prioritizedSlots.slice(0, 4).map(metric => ({
      key: metric.key,
      icon: AlertTriangle,
      label: metric.label,
      color: metric.isCritical ? 'text-orange-500' : 'text-blue-500',
      bgCompleted: metric.isCritical ? 'bg-orange-50' : 'bg-blue-50',
      isPsychology: true,
      psychMetric: metric,
      emoji: metric.icon,
    }));

    // If less than 4 psychology slots, pad with base (already completed)
    while (slots.length < 4) {
      const baseAction = BASE_QUICK_ACTIONS[slots.length];
      slots.push({
        ...baseAction,
        isPsychology: false,
        psychMetric: null,
      });
    }

    return slots;
  }, [allBaseCompleted, prioritizedSlots]);

  // Check if already completed today
  useEffect(() => {
    if (todayCheckin) {
      setMoodValue(todayCheckin.mood_value);
      onMoodSelect(todayCheckin.mood_value);
      
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          if (notes.anxiety) setAnxietyValue(Math.ceil(notes.anxiety / 2));
          if (notes.energy) setEnergyValue(Math.ceil(notes.energy / 2));
          if (notes.sleep) setSleepValue(Math.ceil(notes.sleep / 2));
          
          if (notes.anxiety && notes.energy && notes.sleep) {
            setIsCheckinComplete(true);
            setCurrentStep('complete');
            setShowQuickButtons(false);
          }
        } catch (e) {}
      }
    }
  }, [todayCheckin, onMoodSelect]);

  // Save psychology metric
  const savePsychologyMetric = useCallback(async (metricKey: string, value: number) => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Upsert to daily_psychology
      const { error } = await supabase
        .from('daily_psychology')
        .upsert({
          user_id: user.id,
          date: today,
          [metricKey]: value,
          source: 'checkin',
        }, { onConflict: 'user_id,date,source' });

      if (error) throw error;
      
      toast.success('Dato salvato!', { duration: 1500 });
      setShowQuickButtons(true);
      setCurrentPsychMetric(null);
    } catch (error) {
      console.error('Error saving psychology metric:', error);
      toast.error('Errore nel salvare');
    }
  }, [user]);

  // Save all base parameters
  const saveAllParameters = useCallback(async (
    mood: number,
    anxiety: number,
    energy: number,
    sleep: number
  ) => {
    const moodData = moods.find(m => m.value === mood) || moods[2];
    
    try {
      const notes = JSON.stringify({
        anxiety: anxiety * 2,
        energy: energy * 2,
        sleep: sleep * 2,
        moodDetailed: mood * 2,
      });
      
      await saveCheckin.mutateAsync({
        mood_emoji: moodData.emoji,
        mood_value: moodData.value,
        notes,
      });
      
      setIsCheckinComplete(true);
      setShowQuickButtons(false);
      toast.success('Check-in completato!', { duration: 2000 });
    } catch (error) {
      toast.error('Errore nel salvare');
    }
  }, [saveCheckin]);

  // Handle step selection with auto-advance
  const handleMoodSelect = (mood: { emoji: string; value: number }) => {
    setMoodValue(mood.value);
    onMoodSelect(mood.value);
    setTimeout(() => setCurrentStep('anxiety'), 300);
  };

  const handleAnxietySelect = (value: number) => {
    setAnxietyValue(value);
    setTimeout(() => setCurrentStep('energy'), 300);
  };

  const handleEnergySelect = (value: number) => {
    setEnergyValue(value);
    setTimeout(() => setCurrentStep('sleep'), 300);
  };

  const handleSleepSelect = async (value: number) => {
    setSleepValue(value);
    setCurrentStep('complete');
    await saveAllParameters(
      moodValue || 3,
      anxietyValue || 3,
      energyValue || 3,
      value
    );
  };

  // Handle psychology metric selection
  const handlePsychologySelect = async (value: number) => {
    if (currentPsychMetric) {
      await savePsychologyMetric(currentPsychMetric.key, value);
    }
  };

  // Start check-in flow from quick button
  const handleQuickButtonClick = (action: typeof dynamicQuickActions[0]) => {
    if (action.isPsychology && action.psychMetric) {
      setCurrentPsychMetric(action.psychMetric);
      setCurrentStep('psychology');
      setShowQuickButtons(false);
    } else {
      setShowQuickButtons(false);
      setCurrentStep(action.key as CheckinStep);
    }
  };

  // Reset check-in to edit
  const handleReset = () => {
    setIsCheckinComplete(false);
    setShowQuickButtons(true);
    setCurrentStep('mood');
    setCurrentPsychMetric(null);
  };

  // Get personalized suggestion
  const getSuggestion = useMemo(() => {
    if (!isCheckinComplete) return null;
    
    const anxiety = anxietyValue || 3;
    const energy = energyValue || 3;
    const mood = moodValue || 3;
    
    // Check critical psychology metrics for deeper suggestions
    if (criticalMetrics.length > 0) {
      const topCritical = criticalMetrics[0];
      if (topCritical.key === 'rumination') {
        return {
          icon: <Brain className="w-5 h-5" />,
          title: 'Pensieri ricorrenti',
          message: 'Prova a scrivere i tuoi pensieri per liberare la mente.',
          color: 'text-violet-500',
          bgColor: 'bg-violet-50',
        };
      }
      if (topCritical.key === 'burnout_level') {
        return {
          icon: <Wind className="w-5 h-5" />,
          title: 'Segnali di esaurimento',
          message: 'Concediti una pausa. Il riposo è produttivo.',
          color: 'text-orange-500',
          bgColor: 'bg-orange-50',
        };
      }
    }
    
    if (anxiety >= 4) {
      return {
        icon: <Wind className="w-5 h-5" />,
        title: 'Esercizio di respirazione',
        message: 'Prova 4-7-8: inspira 4 sec, trattieni 7, espira 8.',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
      };
    }
    
    if (energy <= 2) {
      return {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Ricarica le energie',
        message: 'Una breve passeggiata o stretching può aiutare.',
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
      };
    }
    
    if (mood <= 2) {
      return {
        icon: <Heart className="w-5 h-5" />,
        title: 'Prenditi cura di te',
        message: 'Parla con qualcuno o fai qualcosa che ti piace.',
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
      };
    }
    
    return {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Ottima giornata!',
      message: 'Continua così, stai facendo un buon lavoro.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    };
  }, [isCheckinComplete, anxietyValue, energyValue, moodValue, criticalMetrics]);

  // Render Dynamic Quick Buttons
  const renderQuickButtons = () => (
    <div className="grid grid-cols-4 gap-3">
      {dynamicQuickActions.map((action) => {
        const isCompleted = action.isPsychology 
          ? false // Psychology metrics show even if completed (user can update)
          : completedMetrics[action.key as keyof typeof completedMetrics];
        
        const Icon = action.icon;
        const showCriticalBadge = action.isPsychology && action.psychMetric?.isCritical;
        
        return (
          <button
            key={action.key}
            onClick={() => handleQuickButtonClick(action)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200",
              "active:scale-95",
              isCompleted
                ? cn(action.bgCompleted, "border border-emerald-200")
                : showCriticalBadge
                ? "bg-orange-50 border border-orange-200 shadow-sm"
                : "bg-white shadow-sm hover:shadow-md"
            )}
          >
            {/* Critical badge */}
            {showCriticalBadge && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            )}
            
            {isCompleted ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            ) : action.isPsychology ? (
              <span className="text-2xl">{(action as any).emoji}</span>
            ) : (
              <Icon className={cn("w-6 h-6", action.color)} />
            )}
            <span className={cn(
              "text-xs font-medium text-center leading-tight",
              isCompleted ? "text-emerald-700" : showCriticalBadge ? "text-orange-700" : "text-gray-600"
            )}>
              {action.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  // Render psychology metric step
  const renderPsychologyStep = () => {
    if (!currentPsychMetric) return null;
    
    return (
      <div className="animate-fade-in">
        <div className="text-center mb-4">
          <span className="text-4xl mb-2 block">{currentPsychMetric.icon}</span>
          <p className="text-sm text-gray-700 font-medium">{currentPsychMetric.question}</p>
        </div>
        
        <div className="flex justify-between gap-2">
          {genericScale.map((level) => (
            <button
              key={level.value}
              onClick={() => handlePsychologySelect(level.value)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                "active:scale-95 bg-gray-50 hover:bg-primary/10"
              )}
            >
              <span className="text-lg font-bold text-gray-700">{level.icon}</span>
              <span className="text-[9px] font-medium text-gray-500">{level.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'mood':
        return (
          <div className="flex justify-between gap-1">
            {moods.map((mood, index) => {
              const isSelected = moodValue === mood.value;
              return (
                <button
                  key={mood.value}
                  onClick={() => handleMoodSelect(mood)}
                  disabled={saveCheckin.isPending}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected 
                      ? "bg-primary/10 ring-2 ring-primary/20" 
                      : "bg-gray-50 hover:bg-gray-100"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className={cn("text-3xl transition-transform duration-300", isSelected && "scale-110")}>
                    {mood.emoji}
                  </span>
                  <span className={cn("text-[10px] font-medium", isSelected ? "text-primary" : "text-gray-500")}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>
        );
      
      case 'anxiety':
        return (
          <div className="flex justify-between gap-2 animate-fade-in">
            {anxietyLevels.map((level) => {
              const isSelected = anxietyValue === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => handleAnxietySelect(level.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                    "active:scale-95",
                    isSelected 
                      ? `${level.color} text-white scale-105` 
                      : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                  )}
                >
                  <span className="text-xl">{level.icon}</span>
                  <span className="text-[9px] font-medium">{level.label}</span>
                </button>
              );
            })}
          </div>
        );
      
      case 'energy':
        return (
          <div className="flex justify-between gap-2 animate-fade-in">
            {energyLevels.map((level) => {
              const isSelected = energyValue === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => handleEnergySelect(level.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                    "active:scale-95",
                    isSelected 
                      ? "bg-amber-500 text-white scale-105" 
                      : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                  )}
                >
                  <span className="text-xl">{level.icon}</span>
                  <span className="text-[9px] font-medium">{level.label}</span>
                </button>
              );
            })}
          </div>
        );
      
      case 'sleep':
        return (
          <div className="flex justify-between gap-2 animate-fade-in">
            {sleepLevels.map((level) => {
              const isSelected = sleepValue === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => handleSleepSelect(level.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                    "active:scale-95",
                    isSelected 
                      ? "bg-indigo-500 text-white scale-105" 
                      : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                  )}
                >
                  <span className="text-xl">{level.icon}</span>
                  <span className="text-[9px] font-medium">{level.label}</span>
                </button>
              );
            })}
          </div>
        );
      
      case 'psychology':
        return renderPsychologyStep();
      
      default:
        return null;
    }
  };

  // Progress dots
  const steps: CheckinStep[] = ['mood', 'anxiety', 'energy', 'sleep'];
  const currentStepIndex = steps.indexOf(currentStep as Exclude<CheckinStep, 'complete' | 'psychology'>);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-premium">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {getGreeting()}
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          {motivationalPhrase}
        </p>
        
        {/* Quick Buttons or Check-in Flow */}
        {showQuickButtons && !isCheckinComplete ? (
          <div className="animate-fade-in">
            {renderQuickButtons()}
            
            {/* All base complete + psychology available */}
            {allBaseCompleted && prioritizedSlots.length > 0 && (
              <p className="text-xs text-center text-gray-500 mt-3">
                ✨ Check-in base completato! Esplora le altre aree
              </p>
            )}
            
            {/* All complete indicator */}
            {allBaseCompleted && prioritizedSlots.length === 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Tutto aggiornato!</span>
              </div>
            )}
          </div>
        ) : isCheckinComplete ? (
          // Summary Card
          <div className="animate-fade-in">
            {getSuggestion && (
              <div className={cn("p-4 rounded-2xl mb-4", getSuggestion.bgColor)}>
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-xl bg-white/50", getSuggestion.color)}>
                    {getSuggestion.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={cn("font-semibold text-sm", getSuggestion.color)}>
                      {getSuggestion.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {getSuggestion.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Today's values mini-display */}
            <div className="flex justify-between gap-2 mb-4">
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <span className="text-lg">{moods.find(m => m.value === moodValue)?.emoji || '😐'}</span>
                <p className="text-[9px] text-gray-500 mt-0.5">Umore</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <span className="text-lg">{anxietyLevels.find(a => a.value === anxietyValue)?.icon || '😊'}</span>
                <p className="text-[9px] text-gray-500 mt-0.5">Ansia</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <span className="text-lg">{energyLevels.find(e => e.value === energyValue)?.icon || '⚡'}</span>
                <p className="text-[9px] text-gray-500 mt-0.5">Energia</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                <span className="text-lg">{sleepLevels.find(s => s.value === sleepValue)?.icon || '🌙'}</span>
                <p className="text-[9px] text-gray-500 mt-0.5">Sonno</p>
              </div>
            </div>
            
            {/* Weekly Sparkline */}
            {sparklineData.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Umore - ultimi 7 giorni</span>
                </div>
                <div className="h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <defs>
                        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <YAxis domain={[0, 10]} hide />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#sparklineGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {/* Edit button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="w-full mt-3 text-gray-500"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Modifica check-in
            </Button>
          </div>
        ) : (
          // Progressive Check-in Flow
          <div className="animate-fade-in">
            {/* Back button */}
            <button 
              onClick={() => {
                setShowQuickButtons(true);
                setCurrentPsychMetric(null);
              }}
              className="text-sm text-gray-500 mb-3 hover:text-gray-700"
            >
              ← Indietro
            </button>
            
            {/* Step label */}
            {currentStep !== 'complete' && currentStep !== 'psychology' && (
              <p className="text-sm text-gray-700 font-medium mb-3">
                {stepLabels[currentStep]}
              </p>
            )}
            
            {/* Step content */}
            {renderStepContent()}
            
            {/* Progress dots (only for base flow) */}
            {currentStep !== 'psychology' && (
              <div className="flex justify-center gap-2 mt-4">
                {steps.map((step, index) => (
                  <div
                    key={step}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      index < currentStepIndex
                        ? "bg-primary"
                        : index === currentStepIndex
                        ? "bg-primary/60 w-4"
                        : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickCheckin;
