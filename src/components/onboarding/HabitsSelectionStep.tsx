import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, Sparkles } from 'lucide-react';
import { 
  HABIT_TYPES, 
  HABIT_CATEGORIES, 
  getSuggestedHabits,
  getHabitsByCategory,
  HabitCategory 
} from '@/hooks/useHabits';

interface HabitsSelectionStepProps {
  selectedHabits: string[];
  onSelect: (habits: string[]) => void;
  onboardingAnswers?: Record<string, unknown>;
}

const HabitsSelectionStep: React.FC<HabitsSelectionStepProps> = ({
  selectedHabits,
  onSelect,
  onboardingAnswers,
}) => {
  // Get AI-suggested habits based on user's onboarding answers
  const suggestedHabits = useMemo(() => 
    getSuggestedHabits(onboardingAnswers), 
    [onboardingAnswers]
  );
  
  const habitsByCategory = useMemo(() => getHabitsByCategory(), []);

  const toggleHabit = (habitKey: string) => {
    if (selectedHabits.includes(habitKey)) {
      onSelect(selectedHabits.filter(h => h !== habitKey));
    } else {
      onSelect([...selectedHabits, habitKey]);
    }
  };

  const toggleAllSuggested = () => {
    const allSuggestedSelected = suggestedHabits.every(h => selectedHabits.includes(h));
    if (allSuggestedSelected) {
      onSelect(selectedHabits.filter(h => !suggestedHabits.includes(h)));
    } else {
      const newSelection = [...new Set([...selectedHabits, ...suggestedHabits])];
      onSelect(newSelection);
    }
  };

  // Category order for display
  const categoryOrder: HabitCategory[] = [
    'mental', 'health', 'fitness', 'bad_habits', 'nutrition', 'productivity', 'social', 'self_care'
  ];

  return (
    <div className="flex-1 flex flex-col px-6 py-6 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-1">
          Quali abitudini vuoi tracciare?
        </h1>
        <p className="text-sm text-muted-foreground">
          Seleziona quelle che ti interessano, potrai sempre modificarle dopo
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* AI Suggested Section */}
        {suggestedHabits.length > 0 && (
          <div className="mb-4">
            <button
              onClick={toggleAllSuggested}
              className={cn(
                "w-full p-4 rounded-2xl text-left transition-all duration-300",
                "border-2 bg-gradient-to-r from-primary/10 to-primary/5",
                suggestedHabits.every(h => selectedHabits.includes(h))
                  ? "border-primary shadow-glow"
                  : "border-primary/30 hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Suggerite per te</p>
                  <p className="text-xs text-muted-foreground">
                    Basate sui tuoi obiettivi
                  </p>
                </div>
                <div className={cn(
                  "ml-auto w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  suggestedHabits.every(h => selectedHabits.includes(h))
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {suggestedHabits.every(h => selectedHabits.includes(h)) && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {suggestedHabits.slice(0, 6).map(habitKey => {
                  const habit = HABIT_TYPES[habitKey];
                  if (!habit) return null;
                  return (
                    <span 
                      key={habitKey}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium",
                        selectedHabits.includes(habitKey)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {habit.icon} {habit.label}
                    </span>
                  );
                })}
                {suggestedHabits.length > 6 && (
                  <span className="px-3 py-1.5 rounded-full text-sm text-muted-foreground bg-muted">
                    +{suggestedHabits.length - 6} altre
                  </span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Categories */}
        {categoryOrder.map(categoryKey => {
          const category = HABIT_CATEGORIES[categoryKey];
          const habits = habitsByCategory[categoryKey];
          
          if (habits.length === 0) return null;
          
          return (
            <div key={categoryKey} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                {habits.map(({ key, habit }) => {
                  const isSelected = selectedHabits.includes(key);
                  const isSuggested = suggestedHabits.includes(key);
                  
                  return (
                    <button
                      key={key}
                      onClick={() => toggleHabit(key)}
                      className={cn(
                        "p-3 rounded-xl text-left transition-all duration-200",
                        "border flex items-center gap-2",
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-card border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-xl">{habit.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {habit.label}
                        </p>
                      </div>
                      {isSuggested && !isSelected && (
                        <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selection Count */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-center text-sm text-muted-foreground">
          {selectedHabits.length} abitudini selezionate
          {selectedHabits.length === 0 && " • Puoi saltare questo step"}
        </p>
      </div>
    </div>
  );
};

export default HabitsSelectionStep;
