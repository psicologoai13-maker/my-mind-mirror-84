import React, { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

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
        
        <div className="flex justify-between gap-1">
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
      </div>
    </div>
  );
};

export default QuickCheckin;
