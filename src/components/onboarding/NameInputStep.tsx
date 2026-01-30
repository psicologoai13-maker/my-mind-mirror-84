import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

interface NameInputStepProps {
  value: string;
  onChange: (name: string) => void;
  onNext: () => void;
}

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25
};

const NameInputStep: React.FC<NameInputStepProps> = ({ value, onChange, onNext }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length >= 2) {
      onNext();
    }
  };

  // Handle keyboard "Done" button - auto advance
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim().length >= 2) {
      e.preventDefault();
      inputRef.current?.blur();
      onNext();
    }
  };

  const isValid = value.trim().length >= 2;

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Header with Avatar - Aurora themed */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Avatar bubble with Aurora gradient */}
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-aria-violet/20 to-aria-indigo/10 flex items-center justify-center mb-6 border border-aria-violet/30 shadow-aria-glow backdrop-blur-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring}
        >
          <MessageCircle className="w-8 h-8 text-aria-violet" />
        </motion.div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Come posso chiamarti?
        </h1>
        <p className="text-muted-foreground">
          Così potrò rivolgermi a te per nome 😊
        </p>
      </motion.div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1">
          <motion.div 
            className={`
              relative rounded-2xl transition-all duration-300
              ${isFocused ? 'shadow-aria-glow' : 'shadow-glass'}
            `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Il tuo nome"
              enterKeyHint="done"
              className="h-16 text-xl text-center rounded-2xl border-2 bg-glass backdrop-blur-xl transition-all duration-300 focus:border-aria-violet border-glass-border"
              autoFocus
            />
          </motion.div>

          {/* Feedback with Aurora color */}
          <AnimatePresence>
            {isValid && (
              <motion.p 
                className="text-center text-sm text-aria-violet mt-4 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                Piacere di conoscerti, {value}! ✨
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Continue Button with Aurora gradient */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            type="submit"
            disabled={!isValid}
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
          >
            Continua
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </form>
    </div>
  );
};

export default NameInputStep;
