import React, { useState } from 'react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().length >= 2) {
      onNext();
    }
  };

  const isValid = value.trim().length >= 2;

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Header with Avatar */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Avatar bubble */}
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 border border-primary/20 shadow-glass-glow backdrop-blur-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={spring}
        >
          <MessageCircle className="w-8 h-8 text-primary" />
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
              ${isFocused ? 'shadow-glass-glow' : 'shadow-glass'}
            `}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Il tuo nome"
              className="h-16 text-xl text-center rounded-2xl border-2 bg-glass backdrop-blur-xl transition-all duration-300 focus:border-primary border-glass-border"
              autoFocus
            />
          </motion.div>

          {/* Feedback */}
          <AnimatePresence>
            {isValid && (
              <motion.p 
                className="text-center text-sm text-primary mt-4 font-medium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                Piacere di conoscerti, {value}! ✨
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            type="submit"
            disabled={!isValid}
            className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300 disabled:opacity-40 disabled:shadow-none"
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
