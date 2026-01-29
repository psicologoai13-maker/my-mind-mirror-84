import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Target, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ObjectiveSelectionGrid } from './ObjectiveSelectionGrid';
import { CustomObjectiveQuiz } from './CustomObjectiveQuiz';
import { 
  ObjectiveMeta, 
  isAutoSyncObjective,
  ObjectiveInputMethod,
  ObjectiveCategory,
} from '@/lib/objectiveTypes';
import { CreateObjectiveInput } from '@/hooks/useObjectives';

interface ObjectiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateObjectiveInput) => void;
}

type QuizStep = 'select' | 'custom' | 'configure' | 'confirm';

export const ObjectiveQuizModal: React.FC<ObjectiveQuizModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState<QuizStep>('select');
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

  const handleSelectPreset = (objective: ObjectiveMeta) => {
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
    setStep('select');
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
    if (step === 'configure') setStep('select');
    else if (step === 'custom') setStep('select');
    else if (step === 'confirm') {
      if (customData) setStep('custom');
      else setStep('configure');
    }
  };

  const needsStarting = selectedObjective?.requiresStartingValue || 
    (customData?.inputMethod === 'numeric' && ['body', 'finance'].includes(customData.category));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="relative p-4 pb-2 border-b border-glass-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            {step !== 'select' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {step === 'select' && 'Nuovo Obiettivo'}
                  {step === 'custom' && 'Obiettivo Personalizzato'}
                  {step === 'configure' && selectedObjective?.emoji}
                  {step === 'confirm' && '✨ Conferma'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {step === 'select' && 'Scegli dalla libreria o crea il tuo'}
                  {step === 'custom' && 'Descrivi cosa vuoi raggiungere'}
                  {step === 'configure' && selectedObjective?.label}
                  {step === 'confirm' && 'Rivedi e conferma'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ObjectiveSelectionGrid
                  onSelect={handleSelectPreset}
                  onCustom={() => setStep('custom')}
                />
              </motion.div>
            )}

            {step === 'custom' && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <CustomObjectiveQuiz onComplete={handleCustomComplete} />
              </motion.div>
            )}

            {step === 'configure' && selectedObjective && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Auto-sync badge */}
                {isAutoSyncObjective(selectedObjective.inputMethod) && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        Sincronizzazione Automatica
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      {selectedObjective.linkedHabit 
                        ? `Collegato alla habit "${selectedObjective.linkedHabit}"`
                        : 'I progressi si aggiornano automaticamente'}
                    </p>
                  </div>
                )}

                {/* Starting Value (if needed) */}
                {needsStarting && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Da dove parti? <span className="text-muted-foreground">(punto di partenza)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step={selectedObjective.step || 1}
                        value={startingValue}
                        onChange={(e) => setStartingValue(e.target.value)}
                        placeholder={`Es: ${selectedObjective.category === 'body' ? '80' : '1000'}`}
                        className="rounded-xl"
                      />
                      {selectedObjective.unit && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {selectedObjective.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Target Value */}
                {selectedObjective.inputMethod !== 'milestone' && 
                 selectedObjective.inputMethod !== 'session_detected' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Qual è il tuo obiettivo?
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step={selectedObjective.step || 1}
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder={selectedObjective.defaultTarget?.toString() || 'Target'}
                        className="rounded-xl"
                      />
                      {selectedObjective.unit && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {selectedObjective.unit}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Deadline */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Scadenza <span className="text-muted-foreground">(opzionale)</span>
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="rounded-xl"
                  />
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  className="w-full rounded-xl mt-4"
                  disabled={needsStarting && !startingValue}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Crea Obiettivo
                </Button>
              </motion.div>
            )}

            {step === 'confirm' && customData && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-glass border border-glass-border">
                  <h3 className="font-semibold text-lg">{customTitle}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {customData.category}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {customData.inputMethod}
                    </span>
                  </div>
                  {targetValue && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Target: {targetValue} {customData.unit}
                    </p>
                  )}
                  {startingValue && (
                    <p className="text-sm text-muted-foreground">
                      Partenza: {startingValue} {customData.unit}
                    </p>
                  )}
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Scadenza <span className="text-muted-foreground">(opzionale)</span>
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="rounded-xl"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full rounded-xl"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Conferma Obiettivo
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
