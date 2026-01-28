import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, User } from 'lucide-react';

interface NameInputStepProps {
  value: string;
  onChange: (name: string) => void;
  onNext: () => void;
}

const NameInputStep: React.FC<NameInputStepProps> = ({ value, onChange, onNext }) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onNext();
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-12">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-2 animate-slide-up">
          Come ti chiami?
        </h1>
        <p className="text-base text-muted-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
          Così potrò chiamarti per nome 😊
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1">
          <div 
            className={`
              relative rounded-2xl transition-all duration-300
              ${isFocused ? 'shadow-glow' : 'shadow-premium'}
            `}
          >
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Il tuo nome"
              className="h-16 text-xl text-center rounded-2xl border-2 border-transparent focus:border-primary bg-card"
              autoFocus
            />
          </div>

          {/* Encouragement */}
          {value.trim() && (
            <p className="text-center text-sm text-primary mt-4 animate-fade-in">
              Piacere di conoscerti, {value}! ✨
            </p>
          )}
        </div>

        {/* Continue Button */}
        <Button 
          type="submit"
          disabled={!value.trim()}
          className="w-full h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300 disabled:opacity-50"
        >
          Continua
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </form>
    </div>
  );
};

export default NameInputStep;
