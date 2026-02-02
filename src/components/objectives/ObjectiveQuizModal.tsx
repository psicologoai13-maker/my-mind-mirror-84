import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Target, Sparkles, Check, Zap, Link2, Star, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomObjectiveQuiz } from './CustomObjectiveQuiz';
import { 
  ObjectiveMeta, 
  isAutoSyncObjective,
  ObjectiveInputMethod,
  ObjectiveCategory,
  OBJECTIVE_TYPES,
  getObjectivesByCategory,
} from '@/lib/objectiveTypes';
import { CreateObjectiveInput, CATEGORY_CONFIG } from '@/hooks/useObjectives';

interface ObjectiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateObjectiveInput) => void;
}

type QuizStep = 'category' | 'objective' | 'custom' | 'configure' | 'confirm';

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
  const [step, setStep] = useState<QuizStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<ObjectiveCategory | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveMeta | null>(null);
  
  // Configuration values
  const [targetValue, setTargetValue] = useState('');
  const [startingValue, setStartingValue] = useState('');
  const [deadline, setDeadline] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  
  // Custom objective data
  const [customData, setCustomData] = useState<{
    category: ObjectiveCategory;
    inputMethod: ObjectiveInputMethod;
    unit?: string;
  } | null>(null);

  // Progress indicator
  const getProgress = () => {
    switch (step) {
      case 'category': return 25;
      case 'objective': return 50;
      case 'custom': return 50;
      case 'configure': return 75;
      case 'confirm': return 100;
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

  const handleCustomComplete = (data: {
    title: string;
    category: ObjectiveCategory;
    inputMethod: ObjectiveInputMethod;
    unit?: string;
    target?: number;
    starting?: number;
  }) => {
    setCustomTitle(data.title);
    setCustomData({
      category: data.category,
      inputMethod: data.inputMethod,
      unit: data.unit,
    });
    if (data.target) setTargetValue(String(data.target));
    if (data.starting) setStartingValue(String(data.starting));
    setStep('confirm');
  };

  const handleSubmit = () => {
    if (selectedObjective) {
      // Preset objective
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
    } else if (customData) {
      // Custom objective
      onSubmit({
        category: customData.category,
        title: customTitle,
        target_value: targetValue ? parseFloat(targetValue) : undefined,
        starting_value: startingValue ? parseFloat(startingValue) : undefined,
        current_value: startingValue ? parseFloat(startingValue) : 0,
        unit: customData.unit,
        deadline: deadline || undefined,
        input_method: customData.inputMethod,
        auto_sync_enabled: false,
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
    setCustomTitle('');
    setCustomData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const goBack = () => {
    if (step === 'objective') {
      setSelectedCategory(null);
      setStep('category');
    } else if (step === 'custom') {
      setStep('category');
    } else if (step === 'configure') {
      setSelectedObjective(null);
      setStep('objective');
    } else if (step === 'confirm') {
      if (customData) setStep('custom');
      else setStep('configure');
    }
  };

  const needsStarting = selectedObjective?.requiresStartingValue || 
    (customData?.inputMethod === 'numeric' && ['body', 'finance'].includes(customData.category));

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
                {step === 'custom' && '✨ Personalizzato'}
                {step === 'configure' && selectedObjective?.emoji}
                {step === 'confirm' && '🎉 Perfetto!'}
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
                {step === 'custom' && 'Descrivi cosa vuoi raggiungere'}
                {step === 'configure' && selectedObjective?.label}
                {step === 'confirm' && 'Conferma il tuo obiettivo'}
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

                {/* Custom option */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.4 }}
                  onClick={() => setStep('custom')}
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
                    <span className="text-xs text-muted-foreground">Descrivi il tuo obiettivo</span>
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

                {/* See more / Custom */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setStep('custom')}
                  className="w-full p-3 rounded-xl text-center text-sm text-primary font-medium hover:bg-primary/10 transition-colors"
                >
                  <Zap className="h-4 w-4 inline mr-2" />
                  Altro obiettivo personalizzato
                </motion.button>
              </motion.div>
            )}

            {/* STEP 3: Custom Objective */}
            {step === 'custom' && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={spring}
              >
                <CustomObjectiveQuiz onComplete={handleCustomComplete} />
              </motion.div>
            )}

            {/* STEP 4: Configure */}
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
                      📍 Da dove parti?
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        step={selectedObjective.step || 1}
                        value={startingValue}
                        onChange={(e) => setStartingValue(e.target.value)}
                        placeholder={`Es: ${selectedObjective.category === 'body' ? '80' : '1000'}`}
                        className="rounded-xl h-12 text-lg font-semibold"
                      />
                      {selectedObjective.unit && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                          {selectedObjective.unit}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Target Value */}
                {selectedObjective.inputMethod !== 'milestone' && 
                 selectedObjective.inputMethod !== 'session_detected' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-semibold flex items-center gap-2">
                      🎯 Qual è il tuo traguardo?
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        step={selectedObjective.step || 1}
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder={selectedObjective.defaultTarget?.toString() || 'Target'}
                        className="rounded-xl h-12 text-lg font-semibold"
                      />
                      {selectedObjective.unit && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap font-medium">
                          {selectedObjective.unit}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

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

            {/* STEP 5: Confirm Custom */}
            {step === 'confirm' && customData && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={spring}
                className="space-y-5"
              >
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <h3 className="font-bold text-xl text-foreground">{customTitle}</h3>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                      {CATEGORY_CONFIG[customData.category]?.emoji} {CATEGORY_CONFIG[customData.category]?.label}
                    </span>
                  </div>
                  {targetValue && (
                    <p className="text-sm text-muted-foreground mt-3">
                      🎯 Target: <span className="font-semibold text-foreground">{targetValue} {customData.unit}</span>
                    </p>
                  )}
                  {startingValue && (
                    <p className="text-sm text-muted-foreground">
                      📍 Partenza: <span className="font-semibold text-foreground">{startingValue} {customData.unit}</span>
                    </p>
                  )}
                </div>

                {/* Deadline */}
                <div className="space-y-2">
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
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full rounded-2xl h-14 text-base font-bold shadow-lg"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Conferma Obiettivo 🎉
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
