import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Check, RefreshCw, Wind, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const moods = [
  { emoji: '😢', label: 'Triste', value: 1 },
  { emoji: '😔', label: 'Giù', value: 2 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '🙂', label: 'Bene', value: 4 },
  { emoji: '😄', label: 'Ottimo', value: 5 },
];

const anxietyLevels = [
  { icon: '🧘', label: 'Zen', value: 1, color: 'bg-green-500' },
  { icon: '😌', label: 'Calmo', value: 2, color: 'bg-green-400' },
  { icon: '😊', label: 'Ok', value: 3, color: 'bg-yellow-400' },
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

type CheckinStep = 'mood' | 'anxiety' | 'energy' | 'sleep' | 'complete';

const stepLabels: Record<Exclude<CheckinStep, 'complete'>, string> = {
  mood: 'Come ti senti?',
  anxiety: 'Livello di ansia?',
  energy: 'Quanta energia hai?',
  sleep: 'Come hai dormito?',
};

interface QuickCheckinProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number) => void;
}

const QuickCheckin: React.FC<QuickCheckinProps> = ({ selectedMood, onMoodSelect }) => {
  const { todayCheckin, weeklyCheckins, saveCheckin } = useCheckins();
  const { profile } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<CheckinStep>('mood');
  const [moodValue, setMoodValue] = useState<number | null>(null);
  const [anxietyValue, setAnxietyValue] = useState<number | null>(null);
  const [energyValue, setEnergyValue] = useState<number | null>(null);
  const [sleepValue, setSleepValue] = useState<number | null>(null);
  const [isCheckinComplete, setIsCheckinComplete] = useState(false);

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
    return weeklyCheckins.map(c => ({ value: c.mood_value * 2 })); // Scale to 1-10
  }, [weeklyCheckins]);

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
          
          // If all parameters are filled, show summary
          if (notes.anxiety && notes.energy && notes.sleep) {
            setIsCheckinComplete(true);
            setCurrentStep('complete');
          }
        } catch (e) {
          // Notes not in JSON format
        }
      }
    }
  }, [todayCheckin, onMoodSelect]);

  // Save all parameters and complete
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
    // Auto-save after last selection
    await saveAllParameters(
      moodValue || 3,
      anxietyValue || 3,
      value,
      value
    );
  };

  // Reset check-in to edit
  const handleReset = () => {
    setIsCheckinComplete(false);
    setCurrentStep('mood');
  };

  // Get personalized suggestion based on values
  const getSuggestion = useMemo(() => {
    if (!isCheckinComplete) return null;
    
    const anxiety = anxietyValue || 3;
    const energy = energyValue || 3;
    const mood = moodValue || 3;
    
    // High anxiety
    if (anxiety >= 4) {
      return {
        icon: <Wind className="w-5 h-5" />,
        title: 'Esercizio di respirazione',
        message: 'Prova 4-7-8: inspira 4 sec, trattieni 7, espira 8.',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      };
    }
    
    // Low energy
    if (energy <= 2) {
      return {
        icon: <Sparkles className="w-5 h-5" />,
        title: 'Ricarica le energie',
        message: 'Una breve passeggiata o stretching può aiutare.',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
      };
    }
    
    // Low mood
    if (mood <= 2) {
      return {
        icon: <Heart className="w-5 h-5" />,
        title: 'Prenditi cura di te',
        message: 'Parla con qualcuno o fai qualcosa che ti piace.',
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
      };
    }
    
    // Good state
    return {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Ottima giornata!',
      message: 'Continua così, stai facendo un buon lavoro.',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    };
  }, [isCheckinComplete, anxietyValue, energyValue, moodValue]);

  // Render step buttons
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
      
      default:
        return null;
    }
  };

  // Progress dots
  const steps: CheckinStep[] = ['mood', 'anxiety', 'energy', 'sleep'];
  const currentStepIndex = steps.indexOf(currentStep as Exclude<CheckinStep, 'complete'>);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {getGreeting()}
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          {motivationalPhrase}
        </p>
        
        {/* Check-in flow or Summary */}
        {isCheckinComplete ? (
          // Summary Card
          <div className="animate-fade-in">
            {/* Suggestion Card */}
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
            {/* Step label */}
            {currentStep !== 'complete' && (
              <p className="text-sm text-gray-500 mb-3">
                {stepLabels[currentStep]}
              </p>
            )}
            
            {/* Step content */}
            {renderStepContent()}
            
            {/* Progress dots */}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickCheckin;
