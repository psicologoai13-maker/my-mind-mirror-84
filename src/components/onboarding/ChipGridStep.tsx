import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ChipOption {
  id: string;
  label: string;
  emoji: string;
}

interface ChipGridStepProps {
  title: string;
  subtitle?: string;
  encouragement?: string;
  options: ChipOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
  showNoneOption?: boolean;
  noneOptionId?: string;
  noneOptionLabel?: string;
}

const ChipGridStep: React.FC<ChipGridStepProps> = ({
  title,
  subtitle,
  encouragement,
  options,
  selectedValues,
  onChange,
  maxSelections,
  showNoneOption = false,
  noneOptionId = 'none',
  noneOptionLabel = 'Nessuno di questi',
}) => {
  const handleSelect = (optionId: string) => {
    // If selecting "none", clear all other selections
    if (optionId === noneOptionId) {
      if (selectedValues.includes(noneOptionId)) {
        onChange([]);
      } else {
        onChange([noneOptionId]);
      }
      return;
    }

    // If "none" is selected and we're selecting something else, remove "none"
    let newValues = selectedValues.filter(v => v !== noneOptionId);

    if (newValues.includes(optionId)) {
      // Deselect
      newValues = newValues.filter(v => v !== optionId);
    } else {
      // Select (respect max)
      if (maxSelections && newValues.length >= maxSelections) {
        // Replace the first selection
        newValues = [...newValues.slice(1), optionId];
      } else {
        newValues = [...newValues, optionId];
      }
    }

    onChange(newValues);
  };

  const isSelected = (optionId: string) => selectedValues.includes(optionId);

  return (
    <div className="flex-1 flex flex-col px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground">
            {subtitle}
          </p>
        )}
        {maxSelections && (
          <p className="text-sm text-primary mt-2">
            {selectedValues.filter(v => v !== noneOptionId).length}/{maxSelections} selezionati
          </p>
        )}
      </div>

      {/* Chip Grid */}
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="flex flex-wrap gap-3">
          {options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl text-left transition-all duration-300",
                "border-2 animate-scale-in",
                isSelected(option.id)
                  ? "bg-primary/10 border-primary shadow-glow"
                  : "bg-card border-transparent shadow-soft hover:shadow-premium hover:scale-105"
              )}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-xl">{option.emoji}</span>
              <span className={cn(
                "text-sm font-medium",
                isSelected(option.id) ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </span>
              {isSelected(option.id) && (
                <Check className="w-4 h-4 text-primary ml-1 animate-scale-in" />
              )}
            </button>
          ))}

          {/* None Option */}
          {showNoneOption && (
            <button
              onClick={() => handleSelect(noneOptionId)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-2xl text-left transition-all duration-300",
                "border-2 w-full justify-center mt-2",
                isSelected(noneOptionId)
                  ? "bg-muted border-muted-foreground/30"
                  : "bg-card border-transparent shadow-soft hover:shadow-premium"
              )}
            >
              <span className="text-xl">❌</span>
              <span className={cn(
                "text-sm font-medium",
                isSelected(noneOptionId) ? "text-muted-foreground" : "text-foreground"
              )}>
                {noneOptionLabel}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Encouragement */}
      {encouragement && selectedValues.length > 0 && !selectedValues.includes(noneOptionId) && (
        <p className="text-center text-sm text-primary py-4 animate-fade-in">
          {encouragement}
        </p>
      )}
    </div>
  );
};

export default ChipGridStep;
