import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface EmojiSliderProps {
  title: string;
  subtitle?: string;
  value: number;
  onChange: (value: number) => void;
  emojis?: string[];
  labels?: string[];
}

const defaultEmojis = ['😔', '😕', '😐', '🙂', '😊'];
const defaultLabels = ['Molto male', 'Male', 'Così così', 'Bene', 'Molto bene'];

const EmojiSlider: React.FC<EmojiSliderProps> = ({
  title,
  subtitle,
  value,
  onChange,
  emojis = defaultEmojis,
  labels = defaultLabels,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSelect = (index: number) => {
    setIsAnimating(true);
    onChange(index);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      {/* Current Selection Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className={cn(
            "text-8xl mb-4 transition-all duration-300",
            isAnimating ? "scale-125 animate-bounce" : "animate-scale-in"
          )}
        >
          {emojis[value]}
        </div>
        <p className={cn(
          "text-lg font-medium text-foreground mb-12 transition-all duration-300",
          isAnimating && "text-primary"
        )}>
          {labels[value]}
        </p>

        {/* Emoji Row */}
        <div className="flex items-center justify-between w-full max-w-xs gap-2">
          {emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-300",
                index === value
                  ? "bg-primary/15 scale-110 shadow-glow ring-2 ring-primary/30"
                  : "bg-card shadow-soft hover:scale-105 hover:shadow-premium active:scale-95"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Labels */}
        <div className="flex justify-between w-full max-w-xs mt-3 px-1">
          <span className="text-xs text-muted-foreground">Peggio</span>
          <span className="text-xs text-muted-foreground">Meglio</span>
        </div>

        {/* Feedback */}
        {value >= 3 && (
          <p className="text-sm text-primary mt-6 animate-fade-in">
            Che bello sentirti così! 🌟
          </p>
        )}
        {value <= 1 && (
          <p className="text-sm text-muted-foreground mt-6 animate-fade-in">
            Sono qui per aiutarti 💙
          </p>
        )}
      </div>
    </div>
  );
};

export default EmojiSlider;