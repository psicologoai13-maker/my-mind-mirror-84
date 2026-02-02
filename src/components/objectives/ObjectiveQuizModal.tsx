import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Sparkles, Zap, Link2, MessageSquare, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ObjectiveMeta, 
  isAutoSyncObjective,
  ObjectiveCategory,
  getObjectivesByCategory,
} from '@/lib/objectiveTypes';
import { CreateObjectiveInput, CATEGORY_CONFIG } from '@/hooks/useObjectives';

interface ObjectiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateObjectiveInput) => void;
}

type QuizStep = 'category' | 'objective' | 'configure';

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30
};

// Get top objectives for each category (most popular/recommended)
const getTopObjectivesForCategory = (category: ObjectiveCategory): ObjectiveMeta[] => {
  const allForCategory = getObjectivesByCategory(category);
  // Return first 6 objectives (most important ones are at the top)
  return allForCategory.slice(0, 6);
};

export const ObjectiveQuizModal: React.FC<ObjectiveQuizModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<QuizStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<ObjectiveCategory | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveMeta | null>(null);
  
  // Configuration values
  const [targetValue, setTargetValue] = useState('');
  const [startingValue, setStartingValue] = useState('');
  const [deadline, setDeadline] = useState('');

  // Progress indicator
  const getProgress = () => {
    switch (step) {
      case 'category': return 33;
      case 'objective': return 66;
      case 'configure': return 100;
      default: return 0;
    }
  };

  const handleSelectCategory = (category: ObjectiveCategory) => {
    setSelectedCategory(category);
    setStep('objective');
  };

  const handleSelectObjective = (objective: ObjectiveMeta) => {
    setSelectedObjective(objective);
    setStep('configure');
  };

  // Navigate to Aria for custom objective creation
  const handleCustomObjective = () => {
    resetForm();
    onClose();
    // Navigate to chat with a context message for creating a custom objective
    navigate('/chat', { state: { intent: 'create_objective' } });
  };

  const handleSubmit = () => {
    if (selectedObjective) {
      const isAutoSync = isAutoSyncObjective(selectedObjective.inputMethod);
      
      onSubmit({
        category: selectedObjective.category,
        title: selectedObjective.label,
        description: selectedObjective.description,
        target_value: targetValue ? parseFloat(targetValue) : selectedObjective.defaultTarget,
        starting_value: startingValue ? parseFloat(startingValue) : undefined,
        current_value: startingValue ? parseFloat(startingValue) : 0,
        unit: selectedObjective.unit,
        deadline: deadline || undefined,
        input_method: selectedObjective.inputMethod,
        preset_type: selectedObjective.key,
        linked_habit: selectedObjective.linkedHabit,
        linked_body_metric: selectedObjective.linkedBodyMetric,
        auto_sync_enabled: isAutoSync,
      });
    }
    
    // Reset and close
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep('category');
    setSelectedCategory(null);
    setSelectedObjective(null);
    setTargetValue('');
    setStartingValue('');
    setDeadline('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const goBack = () => {
    if (step === 'objective') {
      setSelectedCategory(null);
      setStep('category');
    } else if (step === 'configure') {
      setSelectedObjective(null);
      setStep('objective');
    }
  };

  const needsStarting = selectedObjective?.requiresStartingValue;

  const categoryList = Object.entries(CATEGORY_CONFIG) as [ObjectiveCategory, typeof CATEGORY_CONFIG[ObjectiveCategory]][];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0 bg-card/95 backdrop-blur-xl rounded-3xl border-glass-border">
        {/* Progress Bar */}
        <div className="h-1 bg-muted/30 w-full">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={spring}
          />
        </div>

        {/* Header */}
        <div className="relative px-5 pt-4 pb-3">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            {step !== 'category' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                onClick={goBack}
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.button>
            )}
            <div className="flex-1">
              <motion.h2 
                key={step}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-bold text-xl text-foreground"
              >
                {step === 'category' && '🎯 Nuovo Obiettivo'}
                {step === 'objective' && selectedCategory && CATEGORY_CONFIG[selectedCategory].emoji + ' ' + CATEGORY_CONFIG[selectedCategory].label}
                {step === 'configure' && selectedObjective?.emoji}
              </motion.h2>
              <motion.p 
                key={`desc-${step}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-muted-foreground"
              >
                {step === 'category' && 'Cosa vuoi migliorare?'}
                {step === 'objective' && 'Scegli il tuo obiettivo'}
                {step === 'configure' && selectedObjective?.label}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 overflow-y-auto max-h-[65vh]">
          <AnimatePresence mode="wait">
            {/* STEP 1: Category Selection */}
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={spring}
                className="space-y-3"
              >
                {/* Category Grid - 2 columns, large cards */}
                <div className="grid grid-cols-2 gap-3">
                  {categoryList.map(([key, config], index) => (
                    <motion.button
                      key={key}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring, delay: index * 0.05 }}
                      onClick={() => handleSelectCategory(key)}
                      className={cn(
                        "relative p-4 rounded-2xl text-left transition-all group",
                        "bg-glass backdrop-blur-sm border border-glass-border",
                        "hover:bg-primary/10 hover:border-primary/30",
                        "hover:shadow-lg hover:-translate-y-1",
                        "active:scale-[0.98]"
                      )}
                    >
                      <span className="text-4xl block mb-2 group-hover:scale-110 transition-transform">
                        {config.emoji}
                      </span>
                      <span className="font-semibold text-foreground block">
                        {config.label}
                      </span>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>

                {/* Custom option - redirects to Aria */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.4 }}
                  onClick={handleCustomObjective}
                  className={cn(
                    "w-full p-4 rounded-2xl transition-all",
                    "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
                    "border-2 border-dashed border-primary/30",
                    "hover:border-primary/50 hover:from-primary/15",
                    "flex items-center justify-center gap-3"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-primary block">Ho un'idea diversa</span>
                    <span className="text-xs text-muted-foreground">Parla con Aria per creare il tuo obiettivo</span>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {/* STEP 2: Objective Selection for Category */}
            {step === 'objective' && selectedCategory && (
              <motion.div
                key="objective"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={spring}
                className="space-y-3"
              >
                {getTopObjectivesForCategory(selectedCategory).map((objective, index) => (
                  <motion.button
                    key={objective.key}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: index * 0.06 }}
                    onClick={() => handleSelectObjective(objective)}
                    className={cn(
                      "w-full p-4 rounded-2xl text-left transition-all group",
                      "bg-glass backdrop-blur-sm border border-glass-border",
                      "hover:bg-primary/10 hover:border-primary/30",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      "active:scale-[0.99] flex items-center gap-4"
                    )}
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {objective.emoji}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground block truncate">
                        {objective.label}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {objective.description}
                      </span>
                    </div>
                    
                    {/* Badges */}
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {isAutoSyncObjective(objective.inputMethod) && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                          <Link2 className="h-2.5 w-2.5" />
                          Auto
                        </span>
                      )}
                      {objective.brainDetectable && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </span>
                      )}
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                  </motion.button>
                ))}

                {/* See more / Custom - redirects to Aria */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleCustomObjective}
                  className="w-full p-3 rounded-xl text-center text-sm text-primary font-medium hover:bg-primary/10 transition-colors"
                >
                  <Zap className="h-4 w-4 inline mr-2" />
                  Altro obiettivo personalizzato
                </motion.button>
              </motion.div>
            )}

            {/* STEP 3: Configure */}
            {step === 'configure' && selectedObjective && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={spring}
                className="space-y-5"
              >
                {/* Selected objective preview */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                  <span className="text-4xl">{selectedObjective.emoji}</span>
                  <div>
                    <h3 className="font-bold text-foreground">{selectedObjective.label}</h3>
                    <p className="text-xs text-muted-foreground">{selectedObjective.description}</p>
                  </div>
                </div>

                {/* Auto-sync badge */}
                {isAutoSyncObjective(selectedObjective.inputMethod) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        Sincronizzazione Automatica ✨
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      {selectedObjective.linkedHabit 
                        ? `Collegato all'abitudine "${selectedObjective.linkedHabit}"`
                        : 'I progressi si aggiornano automaticamente'}
                    </p>
                  </motion.div>
                )}

                {/* Starting Value (if needed) */}
                {needsStarting && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold flex items-center gap-2">
                      📍 Punto di partenza
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder={selectedObjective.questionTemplate || 'Valore attuale'}
                        value={startingValue}
                        onChange={(e) => setStartingValue(e.target.value)}
                        step={selectedObjective.step || 1}
                        min={selectedObjective.min}
                        max={selectedObjective.max}
                        className="rounded-xl h-12 text-lg font-medium"
                      />
                      {selectedObjective.unit && (
                        <span className="text-sm text-muted-foreground font-medium min-w-[60px]">
                          {selectedObjective.unit}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Target Value */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold flex items-center gap-2">
                    🎯 Obiettivo finale
                    {selectedObjective.defaultTarget && (
                      <span className="text-muted-foreground font-normal">
                        (suggerito: {selectedObjective.defaultTarget})
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder={String(selectedObjective.defaultTarget || 'Inserisci il target')}
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      step={selectedObjective.step || 1}
                      min={selectedObjective.min}
                      max={selectedObjective.max}
                      className="rounded-xl h-12 text-lg font-medium"
                    />
                    {selectedObjective.unit && (
                      <span className="text-sm text-muted-foreground font-medium min-w-[60px]">
                        {selectedObjective.unit}
                      </span>
                    )}
                  </div>
                </motion.div>

                {/* Deadline */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-semibold flex items-center gap-2">
                    📅 Entro quando?
                    <span className="text-muted-foreground font-normal">(opzionale)</span>
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="rounded-xl h-12"
                  />
                </motion.div>

                {/* Submit */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    onClick={handleSubmit}
                    className="w-full rounded-2xl h-14 text-base font-bold shadow-lg"
                    disabled={needsStarting && !startingValue}
                  >
                    <Star className="h-5 w-5 mr-2" />
                    Crea Obiettivo
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
