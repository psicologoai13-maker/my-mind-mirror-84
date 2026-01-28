import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  onStart: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ onStart }) => {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Animated Avatar */}
      <div className="relative mb-8 animate-scale-in">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center animate-pulse-soft">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
        </div>
        {/* Floating particles */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-primary/30 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 -right-4 w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.8s' }} />
      </div>

      {/* Welcome Text */}
      <h1 className="text-3xl font-bold text-foreground mb-3 animate-slide-up">
        Ciao! Sono Aria 👋
      </h1>
      <p className="text-lg text-muted-foreground mb-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        La tua compagna di benessere
      </p>
      <p className="text-base text-muted-foreground/80 mb-12 max-w-xs animate-slide-up" style={{ animationDelay: '0.2s' }}>
        Rispondi a poche domande per personalizzare la tua esperienza. Ci vorranno solo 3 minuti!
      </p>

      {/* Features Preview */}
      <div className="w-full max-w-xs space-y-3 mb-12 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/50">
          <span className="text-2xl">🎯</span>
          <span className="text-sm text-muted-foreground">Obiettivi personalizzati</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/50">
          <span className="text-2xl">🧠</span>
          <span className="text-sm text-muted-foreground">AI che ti capisce</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card/50">
          <span className="text-2xl">📊</span>
          <span className="text-sm text-muted-foreground">Dashboard su misura</span>
        </div>
      </div>

      {/* CTA Button */}
      <Button 
        onClick={onStart}
        size="lg"
        className="w-full max-w-xs h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300 animate-slide-up"
        style={{ animationDelay: '0.4s' }}
      >
        Iniziamo
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};

export default WelcomeStep;
