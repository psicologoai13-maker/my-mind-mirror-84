import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Objective, CATEGORY_CONFIG, calculateProgress } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { TrendingUp, Plus, Minus, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProgressUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: Objective;
  onSave: (value: number, note?: string) => void;
}

// Determine if this objective uses absolute values or increments
const isAbsoluteValueObjective = (objective: Objective): boolean => {
  // Absolute: you set the total value directly
  const absoluteFinanceTypes = ['accumulation', 'debt_reduction'];
  const absoluteCategories = ['body'];
  
  if (absoluteCategories.includes(objective.category)) return true;
  if (objective.category === 'finance' && absoluteFinanceTypes.includes(objective.finance_tracking_type || '')) return true;
  
  return false;
};

// Get the question to show the user based on objective type
const getQuestionText = (objective: Objective): string => {
  const financeType = objective.finance_tracking_type;
  
  if (objective.category === 'finance') {
    switch (financeType) {
      case 'periodic_saving':
        return 'Quanto hai risparmiato?';
      case 'spending_limit':
        return 'Quanto hai speso?';
      case 'periodic_income':
        return 'Quanto hai guadagnato?';
      case 'accumulation':
        return 'A quanto ammonta il totale?';
      case 'debt_reduction':
        return 'A quanto ammonta il debito attuale?';
      default:
        return 'Aggiorna il valore';
    }
  }
  
  if (objective.category === 'body') {
    if (objective.linked_body_metric === 'weight' || objective.preset_type?.includes('weight')) {
      return 'Quanto pesi oggi?';
    }
    return 'Qual è il valore attuale?';
  }
  
  if (objective.category === 'study') {
    if (objective.unit === 'libri' || objective.preset_type?.includes('book')) {
      return 'Quanti libri hai completato?';
    }
    if (objective.unit === 'ore' || objective.unit === 'h') {
      return 'Quante ore hai studiato?';
    }
  }
  
  // Generic increment question
  if (objective.input_method === 'counter') {
    return `Quanti ${objective.unit || 'unità'} hai completato?`;
  }
  
  return 'Aggiorna il progresso';
};

// Get quick increment buttons based on objective type and target
const getQuickIncrements = (objective: Objective): number[] => {
  const target = objective.target_value ?? 100;
  const current = objective.current_value ?? 0;
  const remaining = Math.max(0, target - current);
  
  // Body objectives use small decimals
  if (objective.category === 'body') {
    return [0.1, 0.5, 1, 2];
  }
  
  // Hours-based objectives
  if (objective.unit === 'ore' || objective.unit === 'h') {
    return [0.5, 1, 2, 4];
  }
  
  // Finance - scale based on target
  if (objective.category === 'finance') {
    if (target >= 10000) return [50, 100, 500, 1000];
    if (target >= 1000) return [10, 50, 100, 500];
    if (target >= 100) return [5, 10, 25, 50];
    return [1, 5, 10, 20];
  }
  
  // For counter objectives, scale increments to target size
  // Target 5 → [1, 2]
  // Target 10 → [1, 2, 5]
  // Target 50 → [1, 5, 10, 25]
  // Target 100+ → [1, 5, 10, 25]
  
  if (target <= 5) {
    // Very small targets: only show increments that make sense
    const increments: number[] = [];
    if (target >= 1) increments.push(1);
    if (target >= 2) increments.push(2);
    if (target >= 3) increments.push(3);
    if (target >= 5) increments.push(5);
    return increments.length > 0 ? increments.slice(0, 4) : [1];
  }
  
  if (target <= 10) {
    return [1, 2, 5];
  }
  
  if (target <= 20) {
    return [1, 2, 5, 10];
  }
  
  if (target <= 50) {
    return [1, 5, 10, 20];
  }
  
  // Default for larger targets
  return [1, 5, 10, 25];
};

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  open,
  onOpenChange,
  objective,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const isAbsolute = isAbsoluteValueObjective(objective);
  const currentValue = objective.current_value ?? 0;
  const targetValue = objective.target_value ?? 0;
  const unit = objective.unit || (objective.category === 'finance' ? '€' : '');
  const categoryConfig = CATEGORY_CONFIG[objective.category];
  const quickIncrements = getQuickIncrements(objective);
  
  // Calculate the new value based on input type
  const numericInput = parseFloat(inputValue) || 0;
  const newValue = isAbsolute ? numericInput : currentValue + numericInput;
  
  // Calculate progress with new value
  const simulatedObjective = { ...objective, current_value: newValue };
  const newProgress = calculateProgress(simulatedObjective);
  const oldProgress = calculateProgress(objective);
  
  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setInputValue('');
      setNote('');
      setShowSuccess(false);
    }
  }, [open]);
  
  const handleQuickIncrement = (increment: number) => {
    if (isAbsolute) {
      // For absolute, add to the displayed input
      setInputValue((prev) => {
        const current = parseFloat(prev) || 0;
        return (current + increment).toString();
      });
    } else {
      // For increments, add to the increment value
      setInputValue((prev) => {
        const current = parseFloat(prev) || 0;
        return (current + increment).toString();
      });
    }
  };
  
  const handleDecrement = (amount: number) => {
    setInputValue((prev) => {
      const current = parseFloat(prev) || 0;
      const newVal = Math.max(0, current - amount);
      return newVal.toString();
    });
  };
  
  const handleSave = () => {
    if (numericInput === 0 && !isAbsolute) return;
    
    setShowSuccess(true);
    setTimeout(() => {
      onSave(newValue, note || undefined);
      onOpenChange(false);
    }, 600);
  };
  
  const hasChange = isAbsolute ? numericInput !== currentValue : numericInput > 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl bg-card/95 backdrop-blur-xl border-glass-border p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center justify-center min-h-[280px]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
              >
                <Check className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <p className="text-lg font-semibold text-foreground">Progresso salvato!</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-xl",
                    "bg-gradient-to-br from-primary/20 to-primary/10"
                  )}>
                    {categoryConfig.emoji}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{objective.title}</DialogTitle>
                    <DialogDescription className="text-sm">
                      {getQuestionText(objective)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="px-6 pb-6 space-y-5">
                {/* Main Input */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 justify-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full shrink-0"
                      onClick={() => handleDecrement(quickIncrements[0])}
                      disabled={numericInput <= 0}
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    
                    <div className="relative flex-1 max-w-[160px]">
                      {unit && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          {unit}
                        </span>
                      )}
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isAbsolute ? currentValue.toString() : '0'}
                        className={cn(
                          "h-14 text-center text-2xl font-bold rounded-2xl",
                          "border-2 border-primary/20 focus-visible:border-primary",
                          unit ? "pl-10" : ""
                        )}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 rounded-full shrink-0"
                      onClick={() => handleQuickIncrement(quickIncrements[0])}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Quick increment buttons */}
                  <div className="flex justify-center gap-2">
                    {quickIncrements.map((inc) => (
                      <Button
                        key={inc}
                        variant="secondary"
                        size="sm"
                        className="rounded-full text-xs px-3"
                        onClick={() => handleQuickIncrement(inc)}
                      >
                        +{inc}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Preview change */}
                {hasChange && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-2xl bg-muted/50 border border-border/50"
                  >
                    <div className="flex items-center justify-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {unit}{currentValue.toLocaleString()}
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {unit}{newValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="h-2 flex-1 max-w-[120px] bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${Math.min(100, newProgress)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {Math.round(newProgress)}%
                      </span>
                    </div>
                  </motion.div>
                )}
                
                {/* Optional note */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Nota (opzionale)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Aggiungi una nota..."
                    className="rounded-xl resize-none h-16 text-sm"
                  />
                </div>
                
                {/* Confirm button */}
                <Button
                  className="w-full h-12 rounded-2xl text-base font-semibold"
                  onClick={handleSave}
                  disabled={!hasChange}
                >
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Conferma Progresso
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
