import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Check, ChevronDown, ChevronUp, Save, Zap, Moon, Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface QuickCheckinProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number) => void;
}

const QuickCheckin: React.FC<QuickCheckinProps> = ({ selectedMood, onMoodSelect }) => {
  const { todayCheckin, saveCheckin } = useCheckins();
  const { profile } = useProfile();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Button states (1-5 scale)
  const [anxietyValue, setAnxietyValue] = useState<number | null>(null);
  const [energyValue, setEnergyValue] = useState<number | null>(null);
  const [sleepValue, setSleepValue] = useState<number | null>(null);

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.name?.split(' ')[0] || '';
    const nameStr = name ? ` ${name}` : '';
    
    if (hour < 6) return `Notte fonda${nameStr}... tutto ok?`;
    if (hour < 12) return `Buongiorno${nameStr}, come stai?`;
    if (hour < 14) return `Buon pranzo${nameStr}!`;
    if (hour < 18) return `Buon pomeriggio${nameStr}, come va?`;
    if (hour < 21) return `Buonasera${nameStr}, vuoi sfogarti un po'?`;
    return `Buonanotte${nameStr}, come è andata oggi?`;
  };

  // Get a random motivational phrase (changes daily)
  const motivationalPhrase = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % motivationalPhrases.length;
    return motivationalPhrases[index];
  }, []);

  // Sync with database
  useEffect(() => {
    if (todayCheckin) {
      onMoodSelect(todayCheckin.mood_value);
      // Parse notes if available
      if (todayCheckin.notes) {
        try {
          const notes = JSON.parse(todayCheckin.notes);
          if (notes.anxiety) setAnxietyValue(Math.ceil(notes.anxiety / 2));
          if (notes.energy) setEnergyValue(Math.ceil(notes.energy / 2));
          if (notes.sleep) setSleepValue(Math.ceil(notes.sleep / 2));
        } catch (e) {
          // Notes not in JSON format
        }
      }
    }
  }, [todayCheckin, onMoodSelect]);

  const handleMoodSelect = async (mood: { emoji: string; value: number }) => {
    onMoodSelect(mood.value);
    
    try {
      await saveCheckin.mutateAsync({
        mood_emoji: mood.emoji,
        mood_value: mood.value,
      });
      toast.success('Umore registrato!', { duration: 2000 });
    } catch (error) {
      toast.error('Errore nel salvare l\'umore');
    }
  };

  const handleSaveParameters = async () => {
    const mood = moods.find(m => m.value === selectedMood) || moods[2];
    
    try {
      // Convert 1-5 scale to 1-10 for storage
      const notes = JSON.stringify({
        anxiety: anxietyValue ? anxietyValue * 2 : 5,
        energy: energyValue ? energyValue * 2 : 5,
        sleep: sleepValue ? sleepValue * 2 : 5,
        moodDetailed: selectedMood ? selectedMood * 2 : 5,
      });
      
      await saveCheckin.mutateAsync({
        mood_emoji: mood.emoji,
        mood_value: mood.value,
        notes,
      });
      
      setIsExpanded(false);
      toast.success('Parametri salvati!', { duration: 2000 });
    } catch (error) {
      toast.error('Errore nel salvare');
    }
  };

  const canSave = anxietyValue !== null || energyValue !== null || sleepValue !== null;

  return (
    <div className="relative overflow-hidden bg-card/80 backdrop-blur-xl rounded-3xl p-6 shadow-soft border border-border/50">
      {/* Glassmorphism decorative blur */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/30 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <h2 className="font-display text-xl font-semibold text-foreground mb-1">
          {getGreeting()}
        </h2>
        <p className="text-sm text-primary font-medium italic mb-5">
          "{motivationalPhrase}"
        </p>
        
        {/* Quick emoji selector */}
        <div className="flex justify-between gap-1 mb-4">
          {moods.map((mood, index) => {
            const isSelected = selectedMood === mood.value;
            return (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood)}
                disabled={saveCheckin.isPending}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-300",
                  "hover:scale-110 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isSelected 
                    ? "bg-primary/20 shadow-lg ring-2 ring-primary/30" 
                    : "bg-muted/50 hover:bg-muted backdrop-blur-sm"
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <span className={cn(
                  "text-3xl transition-transform duration-300",
                  isSelected && "scale-110"
                )}>
                  {mood.emoji}
                </span>
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {mood.label}
                </span>
                {isSelected && todayCheckin && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Expand/Collapse button for detailed parameters */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Chiudi parametri
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Aggiorna altri parametri
            </>
          )}
        </button>

        {/* Expanded one-tap buttons panel */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-5 animate-fade-in">
            
            {/* Anxiety Buttons */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">😰 Ansia</span>
              <div className="flex justify-between gap-2">
                {anxietyLevels.map((level) => {
                  const isSelected = anxietyValue === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => setAnxietyValue(level.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                        "active:scale-95",
                        isSelected 
                          ? `${level.color} text-white shadow-lg scale-105` 
                          : "bg-muted/50 hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="text-xl">{level.icon}</span>
                      <span className="text-[9px] font-medium">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Energy Buttons */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">⚡ Energia</span>
              <div className="flex justify-between gap-2">
                {energyLevels.map((level) => {
                  const isSelected = energyValue === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => setEnergyValue(level.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                        "active:scale-95",
                        isSelected 
                          ? "bg-amber-500 text-white shadow-lg scale-105" 
                          : "bg-muted/50 hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="text-xl">{level.icon}</span>
                      <span className="text-[9px] font-medium">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sleep Buttons */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">💤 Sonno</span>
              <div className="flex justify-between gap-2">
                {sleepLevels.map((level) => {
                  const isSelected = sleepValue === level.value;
                  return (
                    <button
                      key={level.value}
                      onClick={() => setSleepValue(level.value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200",
                        "active:scale-95",
                        isSelected 
                          ? "bg-indigo-500 text-white shadow-lg scale-105" 
                          : "bg-muted/50 hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="text-xl">{level.icon}</span>
                      <span className="text-[9px] font-medium">{level.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <Button 
              onClick={handleSaveParameters}
              disabled={saveCheckin.isPending || !canSave}
              className="w-full mt-4"
            >
              <Save className="w-4 h-4 mr-2" />
              Salva parametri
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickCheckin;