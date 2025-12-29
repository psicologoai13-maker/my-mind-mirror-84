import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
}

interface QuizStepProps {
  title: string;
  subtitle?: string;
  options: QuizOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiSelect?: (values: string[]) => void;
}

const QuizStep: React.FC<QuizStepProps> = ({
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  multiSelect = false,
  selectedValues = [],
  onMultiSelect,
}) => {
  const handleSelect = (optionId: string) => {
    if (multiSelect && onMultiSelect) {
      const newValues = selectedValues.includes(optionId)
        ? selectedValues.filter(v => v !== optionId)
        : [...selectedValues, optionId];
      onMultiSelect(newValues);
    } else {
      onSelect(optionId);
    }
  };

  const isSelected = (optionId: string) => {
    return multiSelect ? selectedValues.includes(optionId) : selectedValue === optionId;
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="flex-1 flex flex-col gap-3">
        {options.map((option, index) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={cn(
              "w-full p-5 rounded-2xl text-left transition-all duration-300",
              "border-2 flex items-center gap-4",
              "animate-slide-up",
              isSelected(option.id)
                ? "bg-primary/10 border-primary shadow-glow"
                : "bg-card border-transparent shadow-premium hover:shadow-elevated hover:scale-[1.02]"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Emoji or Checkbox */}
            {option.emoji ? (
              <span className="text-3xl">{option.emoji}</span>
            ) : (
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected(option.id)
                  ? "bg-primary border-primary"
                  : "border-muted-foreground/30"
              )}>
                {isSelected(option.id) && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            )}

            {/* Label */}
            <div className="flex-1">
              <span className={cn(
                "text-base font-medium",
                isSelected(option.id) ? "text-primary" : "text-foreground"
              )}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuizStep;