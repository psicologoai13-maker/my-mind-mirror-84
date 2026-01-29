import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChevronRight, Target, Hash, CheckCircle, Brain, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ObjectiveCategory, 
  ObjectiveInputMethod,
  getAllCategories,
} from '@/lib/objectiveTypes';

interface CustomObjectiveQuizProps {
  onComplete: (data: {
    title: string;
    category: ObjectiveCategory;
    inputMethod: ObjectiveInputMethod;
    unit?: string;
    target?: number;
    starting?: number;
  }) => void;
}

type QuizStep = 'title' | 'category' | 'measurable' | 'target' | 'starting';

export const CustomObjectiveQuiz: React.FC<CustomObjectiveQuizProps> = ({
  onComplete,
}) => {
  const [step, setStep] = useState<QuizStep>('title');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ObjectiveCategory | null>(null);
  const [isMeasurable, setIsMeasurable] = useState<boolean | null>(null);
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [starting, setStarting] = useState('');

  const categories = getAllCategories();

  const handleNext = () => {
    if (step === 'title' && title.trim()) {
      setStep('category');
    } else if (step === 'category' && category) {
      setStep('measurable');
    } else if (step === 'measurable' && isMeasurable !== null) {
      if (isMeasurable) {
        setStep('target');
      } else {
        // Non-measurable = milestone or session_detected
        const inputMethod: ObjectiveInputMethod = 
          category === 'mind' ? 'session_detected' : 'milestone';
        onComplete({
          title,
          category: category!,
          inputMethod,
        });
      }
    } else if (step === 'target' && target) {
      // Check if needs starting value (body/finance)
      if (category === 'body' || category === 'finance') {
        setStep('starting');
      } else {
        onComplete({
          title,
          category: category!,
          inputMethod: 'numeric',
          unit: unit || undefined,
          target: parseFloat(target),
        });
      }
    } else if (step === 'starting') {
      onComplete({
        title,
        category: category!,
        inputMethod: 'numeric',
        unit: unit || undefined,
        target: parseFloat(target),
        starting: starting ? parseFloat(starting) : undefined,
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'title': return title.trim().length > 0;
      case 'category': return category !== null;
      case 'measurable': return isMeasurable !== null;
      case 'target': return target.trim().length > 0;
      case 'starting': return starting.trim().length > 0;
      default: return false;
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {/* Step 1: Title */}
        {step === 'title' && (
          <motion.div
            key="title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Cosa vuoi raggiungere?</h3>
              <p className="text-sm text-muted-foreground">
                Descrivi il tuo obiettivo in poche parole
              </p>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Correre 10km, Risparmiare per vacanza..."
              className="rounded-xl text-center text-lg py-6"
              autoFocus
            />
          </motion.div>
        )}

        {/* Step 2: Category */}
        {step === 'category' && (
          <motion.div
            key="category"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">In quale area rientra?</h3>
              <p className="text-sm text-muted-foreground">
                "{title}"
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={cn(
                    "p-4 rounded-2xl text-left transition-all",
                    "border-2",
                    category === cat.key
                      ? "border-primary bg-primary/10"
                      : "border-glass-border bg-glass hover:border-primary/30"
                  )}
                >
                  <span className="text-2xl block mb-1">{cat.emoji}</span>
                  <span className="font-medium text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Measurable */}
        {step === 'measurable' && (
          <motion.div
            key="measurable"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">È misurabile?</h3>
              <p className="text-sm text-muted-foreground">
                Puoi tracciare i progressi con un numero?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsMeasurable(true)}
                className={cn(
                  "p-5 rounded-2xl transition-all flex flex-col items-center gap-2",
                  "border-2",
                  isMeasurable === true
                    ? "border-primary bg-primary/10"
                    : "border-glass-border bg-glass hover:border-primary/30"
                )}
              >
                <Hash className="h-8 w-8 text-primary" />
                <span className="font-medium">Sì, con numeri</span>
                <span className="text-xs text-muted-foreground text-center">
                  Es: kg, €, ore, libri
                </span>
              </button>
              <button
                onClick={() => setIsMeasurable(false)}
                className={cn(
                  "p-5 rounded-2xl transition-all flex flex-col items-center gap-2",
                  "border-2",
                  isMeasurable === false
                    ? "border-primary bg-primary/10"
                    : "border-glass-border bg-glass hover:border-primary/30"
                )}
              >
                <CheckCircle className="h-8 w-8 text-emerald-500" />
                <span className="font-medium">No, è un traguardo</span>
                <span className="text-xs text-muted-foreground text-center">
                  Es: superare esame, ottenere promozione
                </span>
              </button>
            </div>
            {category === 'mind' && isMeasurable === false && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-purple-700 dark:text-purple-300">
                  Aria rileverà i tuoi progressi nelle conversazioni
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Target */}
        {step === 'target' && (
          <motion.div
            key="target"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Qual è il target?</h3>
              <p className="text-sm text-muted-foreground">
                Che valore vuoi raggiungere?
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Es: 70, 5000, 12"
                  className="rounded-xl text-center text-lg py-6 flex-1"
                  autoFocus
                />
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="unità"
                  className="rounded-xl w-24"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Es: 70 kg, 5000 €, 12 libri
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 5: Starting Value */}
        {step === 'starting' && (
          <motion.div
            key="starting"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Punto di partenza?</h3>
              <p className="text-sm text-muted-foreground">
                Da dove parti oggi?
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={starting}
                onChange={(e) => setStarting(e.target.value)}
                placeholder={`Valore attuale`}
                className="rounded-xl text-center text-lg py-6 flex-1"
                autoFocus
              />
              {unit && (
                <span className="text-lg text-muted-foreground">{unit}</span>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{starting || '?'}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-primary">{target}</span>
              {unit && <span>{unit}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Button */}
      <Button
        onClick={handleNext}
        disabled={!canProceed()}
        className="w-full rounded-xl"
      >
        {step === 'starting' || (step === 'measurable' && !isMeasurable) || (step === 'target' && category !== 'body' && category !== 'finance')
          ? 'Crea Obiettivo'
          : 'Continua'
        }
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};
