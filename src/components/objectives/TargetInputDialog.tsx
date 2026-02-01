import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, TrendingUp, Wallet, PiggyBank, CreditCard, Receipt } from 'lucide-react';
import type { FinanceTrackingType, TrackingPeriod } from '@/hooks/useObjectives';

interface TargetInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveTitle: string;
  objectiveCategory: string;
  unit?: string | null;
  hasStartingValue: boolean;
  hasTargetValue: boolean;
  financeTrackingType?: FinanceTrackingType | null;
  onSave: (data: {
    startingValue: number | null;
    targetValue: number | null;
    financeTrackingType?: FinanceTrackingType;
    trackingPeriod?: TrackingPeriod;
  }) => void;
}

const FINANCE_TYPES = [
  { 
    id: 'accumulation' as FinanceTrackingType, 
    label: 'Accumulare', 
    description: 'Raggiungere una cifra (es. 10.000€)', 
    icon: PiggyBank,
    needsStarting: true,
    needsTarget: true,
    periodRequired: false
  },
  { 
    id: 'periodic_saving' as FinanceTrackingType, 
    label: 'Risparmio periodico', 
    description: 'X€ al mese/settimana', 
    icon: TrendingUp,
    needsStarting: false,
    needsTarget: true,
    periodRequired: true
  },
  { 
    id: 'spending_limit' as FinanceTrackingType, 
    label: 'Limite spese', 
    description: 'Max X€ al mese', 
    icon: Receipt,
    needsStarting: false,
    needsTarget: true,
    periodRequired: true
  },
  { 
    id: 'periodic_income' as FinanceTrackingType, 
    label: 'Obiettivo guadagno', 
    description: 'Guadagnare X€ al mese', 
    icon: Wallet,
    needsStarting: false,
    needsTarget: true,
    periodRequired: true
  },
  { 
    id: 'debt_reduction' as FinanceTrackingType, 
    label: 'Estinguere debito', 
    description: 'Ripagare un debito', 
    icon: CreditCard,
    needsStarting: true,
    needsTarget: false,
    periodRequired: false
  },
];

const PERIODS: { id: TrackingPeriod; label: string }[] = [
  { id: 'daily', label: 'Al giorno' },
  { id: 'weekly', label: 'A settimana' },
  { id: 'monthly', label: 'Al mese' },
  { id: 'yearly', label: 'All\'anno' },
];

export const TargetInputDialog: React.FC<TargetInputDialogProps> = ({
  open,
  onOpenChange,
  objectiveTitle,
  objectiveCategory,
  unit,
  hasStartingValue,
  hasTargetValue,
  financeTrackingType: initialFinanceType,
  onSave,
}) => {
  const [step, setStep] = useState<'type' | 'values'>(
    objectiveCategory === 'finance' && !initialFinanceType ? 'type' : 'values'
  );
  const [selectedFinanceType, setSelectedFinanceType] = useState<FinanceTrackingType | null>(
    initialFinanceType || null
  );
  const [trackingPeriod, setTrackingPeriod] = useState<TrackingPeriod>('monthly');
  const [startingValue, setStartingValue] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');

  const isFinance = objectiveCategory === 'finance';
  const selectedTypeConfig = FINANCE_TYPES.find(t => t.id === selectedFinanceType);

  const handleTypeSelect = (type: FinanceTrackingType) => {
    setSelectedFinanceType(type);
    setStep('values');
  };

  const handleSave = () => {
    const sv = startingValue ? parseFloat(startingValue) : null;
    let tv = targetValue ? parseFloat(targetValue) : null;
    
    // For debt reduction, target is always 0
    if (selectedFinanceType === 'debt_reduction') {
      tv = 0;
    }

    onSave({
      startingValue: sv,
      targetValue: tv,
      financeTrackingType: selectedFinanceType || undefined,
      trackingPeriod: selectedTypeConfig?.periodRequired ? trackingPeriod : undefined,
    });
    
    // Reset state
    setStartingValue('');
    setTargetValue('');
    setStep(isFinance ? 'type' : 'values');
    onOpenChange(false);
  };

  const handleClose = () => {
    setStep(isFinance && !initialFinanceType ? 'type' : 'values');
    setStartingValue('');
    setTargetValue('');
    onOpenChange(false);
  };

  const unitLabel = unit || (isFinance ? '€' : '');

  // Determine what fields to show
  const showStarting = isFinance 
    ? selectedTypeConfig?.needsStarting && !hasStartingValue
    : !hasStartingValue;
  const showTarget = isFinance
    ? selectedTypeConfig?.needsTarget && !hasTargetValue
    : !hasTargetValue;
  const showPeriod = isFinance && selectedTypeConfig?.periodRequired;

  // Get appropriate labels based on finance type
  const getLabels = () => {
    if (!isFinance) {
      return {
        startingLabel: 'Punto di partenza',
        startingHint: 'Da dove parti? (es. peso attuale)',
        targetLabel: 'Obiettivo finale',
        targetHint: 'Dove vuoi arrivare? (es. peso obiettivo)',
      };
    }

    switch (selectedFinanceType) {
      case 'accumulation':
        return {
          startingLabel: 'Quanto hai adesso',
          startingHint: 'I tuoi risparmi attuali',
          targetLabel: 'Obiettivo da raggiungere',
          targetHint: 'La cifra che vuoi accumulare',
        };
      case 'periodic_saving':
        return {
          startingLabel: '',
          startingHint: '',
          targetLabel: 'Quanto vuoi risparmiare',
          targetHint: 'L\'importo che vuoi mettere da parte',
        };
      case 'spending_limit':
        return {
          startingLabel: '',
          startingHint: '',
          targetLabel: 'Budget massimo',
          targetHint: 'Il limite che non vuoi superare',
        };
      case 'periodic_income':
        return {
          startingLabel: '',
          startingHint: '',
          targetLabel: 'Obiettivo guadagno',
          targetHint: 'Quanto vuoi guadagnare',
        };
      case 'debt_reduction':
        return {
          startingLabel: 'Debito attuale',
          startingHint: 'Quanto devi ancora ripagare',
          targetLabel: '',
          targetHint: '',
        };
      default:
        return {
          startingLabel: 'Situazione attuale',
          startingHint: '',
          targetLabel: 'Obiettivo',
          targetHint: '',
        };
    }
  };

  const labels = getLabels();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {isFinance && step === 'type' ? 'Tipo di obiettivo' : 'Definisci i tuoi traguardi'}
          </DialogTitle>
          <DialogDescription>
            {isFinance && step === 'type' 
              ? `Che tipo di obiettivo è "${objectiveTitle}"?`
              : `Imposta i valori per "${objectiveTitle}" per tracciare i progressi.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Step 1: Finance Type Selection */}
        {isFinance && step === 'type' && (
          <div className="grid gap-2 py-4">
            {FINANCE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Values Input */}
        {step === 'values' && (
          <div className="grid gap-4 py-4">
            {showPeriod && (
              <div className="grid gap-2">
                <Label>Periodo</Label>
                <div className="flex gap-2 flex-wrap">
                  {PERIODS.map((period) => (
                    <button
                      key={period.id}
                      onClick={() => setTrackingPeriod(period.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        trackingPeriod === period.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showStarting && labels.startingLabel && (
              <div className="grid gap-2">
                <Label htmlFor="starting">{labels.startingLabel} {unitLabel && `(${unitLabel})`}</Label>
                <Input
                  id="starting"
                  type="number"
                  step="0.01"
                  placeholder={`Es: 2000 ${unitLabel}`}
                  value={startingValue}
                  onChange={(e) => setStartingValue(e.target.value)}
                  className="text-base"
                />
                {labels.startingHint && (
                  <p className="text-xs text-muted-foreground">{labels.startingHint}</p>
                )}
              </div>
            )}
            
            {showTarget && labels.targetLabel && (
              <div className="grid gap-2">
                <Label htmlFor="target">
                  {labels.targetLabel} {unitLabel && `(${unitLabel})`}
                  {showPeriod && trackingPeriod && (
                    <span className="text-muted-foreground font-normal">
                      {' '}{PERIODS.find(p => p.id === trackingPeriod)?.label.toLowerCase()}
                    </span>
                  )}
                </Label>
                <Input
                  id="target"
                  type="number"
                  step="0.01"
                  placeholder={`Es: ${isFinance ? '500' : '80'} ${unitLabel}`}
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="text-base"
                />
                {labels.targetHint && (
                  <p className="text-xs text-muted-foreground">{labels.targetHint}</p>
                )}
              </div>
            )}

            {selectedFinanceType === 'debt_reduction' && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 L'obiettivo è portare il debito a 0€. Inserisci quanto devi ancora ripagare.
              </p>
            )}
          </div>
        )}
        
        <DialogFooter>
          {isFinance && step === 'values' && !initialFinanceType && (
            <Button variant="outline" onClick={() => setStep('type')}>
              Indietro
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          {step === 'values' && (
            <Button 
              onClick={handleSave}
              disabled={
                (showStarting && labels.startingLabel && !startingValue) && 
                (showTarget && labels.targetLabel && !targetValue)
              }
            >
              Salva
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
