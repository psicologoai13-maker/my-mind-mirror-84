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
import { Target } from 'lucide-react';

interface TargetInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveTitle: string;
  unit?: string | null;
  hasStartingValue: boolean;
  hasTargetValue: boolean;
  onSave: (startingValue: number | null, targetValue: number | null) => void;
}

export const TargetInputDialog: React.FC<TargetInputDialogProps> = ({
  open,
  onOpenChange,
  objectiveTitle,
  unit,
  hasStartingValue,
  hasTargetValue,
  onSave,
}) => {
  const [startingValue, setStartingValue] = useState<string>('');
  const [targetValue, setTargetValue] = useState<string>('');

  const handleSave = () => {
    const sv = startingValue ? parseFloat(startingValue) : null;
    const tv = targetValue ? parseFloat(targetValue) : null;
    onSave(sv, tv);
    setStartingValue('');
    setTargetValue('');
    onOpenChange(false);
  };

  const unitLabel = unit || '';
  const needsStarting = !hasStartingValue;
  const needsTarget = !hasTargetValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Definisci i tuoi traguardi
          </DialogTitle>
          <DialogDescription>
            Imposta i valori per "{objectiveTitle}" per poter tracciare i progressi.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {needsStarting && (
            <div className="grid gap-2">
              <Label htmlFor="starting">Punto di partenza {unitLabel && `(${unitLabel})`}</Label>
              <Input
                id="starting"
                type="number"
                step="0.1"
                placeholder={`Es: 70 ${unitLabel}`}
                value={startingValue}
                onChange={(e) => setStartingValue(e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Da dove parti? (es. peso attuale, risparmi attuali)
              </p>
            </div>
          )}
          
          {needsTarget && (
            <div className="grid gap-2">
              <Label htmlFor="target">Obiettivo finale {unitLabel && `(${unitLabel})`}</Label>
              <Input
                id="target"
                type="number"
                step="0.1"
                placeholder={`Es: 80 ${unitLabel}`}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Dove vuoi arrivare? (es. peso obiettivo, cifra da risparmiare)
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleSave}
            disabled={(needsStarting && !startingValue) && (needsTarget && !targetValue)}
          >
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
