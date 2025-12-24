import React from 'react';
import { cn } from '@/lib/utils';

const moods = [
  { emoji: '😢', label: 'Triste', value: 1, color: 'bg-mood-bad' },
  { emoji: '😔', label: 'Giù', value: 2, color: 'bg-mood-low' },
  { emoji: '😐', label: 'Neutro', value: 3, color: 'bg-mood-neutral' },
  { emoji: '🙂', label: 'Bene', value: 4, color: 'bg-mood-good' },
  { emoji: '😄', label: 'Ottimo', value: 5, color: 'bg-mood-excellent' },
];

interface MoodSelectorProps {
  selectedMood: number | null;
  onMoodSelect: (mood: number) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onMoodSelect }) => {
  return (
    <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up">
      <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
        Come ti senti oggi?
      </h3>
      <div className="flex justify-between gap-2">
        {moods.map((mood, index) => (
          <button
            key={mood.value}
            onClick={() => onMoodSelect(mood.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300",
              "hover:scale-110 active:scale-95",
              selectedMood === mood.value 
                ? `${mood.color} shadow-card scale-110` 
                : "bg-muted hover:bg-muted/80"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className={cn(
              "text-xs font-medium",
              selectedMood === mood.value ? "text-primary-foreground" : "text-muted-foreground"
            )}>
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MoodSelector;
