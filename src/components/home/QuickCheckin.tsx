import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Check, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

const moods = [
  { emoji: '😢', label: 'Triste', value: 1 },
  { emoji: '😔', label: 'Giù', value: 2 },
  { emoji: '😐', label: 'Neutro', value: 3 },
  { emoji: '🙂', label: 'Bene', value: 4 },
  { emoji: '😄', label: 'Ottimo', value: 5 },
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
  
  // Slider states (1-10 scale)
  const [moodValue, setMoodValue] = useState(5);
  const [anxietyValue, setAnxietyValue] = useState(5);
  const [energyValue, setEnergyValue] = useState(5);
  const [sleepValue, setSleepValue] = useState(5);

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
      setMoodValue(todayCheckin.mood_value * 2); // Convert 1-5 to 1-10 scale
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

  const handleSaveSliders = async () => {
    // Convert mood from 1-10 to 1-5 scale for the emoji system
    const moodIndex = Math.min(4, Math.floor((moodValue - 1) / 2));
    const mood = moods[moodIndex];
    
    try {
      // Create notes with all parameters
      const notes = JSON.stringify({
        anxiety: anxietyValue,
        energy: energyValue,
        sleep: sleepValue,
        moodDetailed: moodValue,
      });
      
      await saveCheckin.mutateAsync({
        mood_emoji: mood.emoji,
        mood_value: mood.value,
        notes,
      });
      
      onMoodSelect(mood.value);
      setIsExpanded(false);
      toast.success('Parametri salvati!', { duration: 2000 });
    } catch (error) {
      toast.error('Errore nel salvare');
    }
  };

  const getSliderLabel = (type: 'mood' | 'anxiety' | 'energy' | 'sleep', value: number) => {
    const labels = {
      mood: ['Triste', 'Giù', 'Basso', 'Neutro', 'Ok', 'Discreto', 'Buono', 'Bene', 'Ottimo', 'Euforico'],
      anxiety: ['Calma', 'Sereno', 'Rilassato', 'Ok', 'Leggera', 'Moderata', 'Tesa', 'Alta', 'Forte', 'Panico'],
      energy: ['Esausto', 'Molto bassa', 'Bassa', 'Scarsa', 'Neutra', 'Ok', 'Buona', 'Alta', 'Molto alta', 'Carico'],
      sleep: ['Pessimo', 'Molto male', 'Male', 'Scarso', 'Ok', 'Discreto', 'Buono', 'Molto buono', 'Ottimo', 'Perfetto'],
    };
    return labels[type][value - 1] || '';
  };

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

        {/* Expand/Collapse button for detailed sliders */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Chiudi regolazione dettagliata
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Aggiorna i tuoi parametri
            </>
          )}
        </button>

        {/* Expanded sliders panel */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border/50 space-y-5 animate-fade-in">
            {/* Mood Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>😌</span> Umore
                </span>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel('mood', moodValue)} ({moodValue}/10)
                </span>
              </div>
              <Slider
                value={[moodValue]}
                onValueChange={(v) => setMoodValue(v[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Triste</span>
                <span>Felice</span>
              </div>
            </div>

            {/* Anxiety Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>😰</span> Ansia
                </span>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel('anxiety', anxietyValue)} ({anxietyValue}/10)
                </span>
              </div>
              <Slider
                value={[anxietyValue]}
                onValueChange={(v) => setAnxietyValue(v[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Calma</span>
                <span>Panico</span>
              </div>
            </div>

            {/* Energy Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>🔋</span> Energia
                </span>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel('energy', energyValue)} ({energyValue}/10)
                </span>
              </div>
              <Slider
                value={[energyValue]}
                onValueChange={(v) => setEnergyValue(v[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Bassa</span>
                <span>Alta</span>
              </div>
            </div>

            {/* Sleep Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span>💤</span> Sonno
                </span>
                <span className="text-xs text-muted-foreground">
                  {getSliderLabel('sleep', sleepValue)} ({sleepValue}/10)
                </span>
              </div>
              <Slider
                value={[sleepValue]}
                onValueChange={(v) => setSleepValue(v[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Pessimo</span>
                <span>Ottimo</span>
              </div>
            </div>

            {/* Save button */}
            <Button 
              onClick={handleSaveSliders}
              disabled={saveCheckin.isPending}
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