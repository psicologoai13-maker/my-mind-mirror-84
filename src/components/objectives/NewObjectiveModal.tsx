import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ObjectiveCategory, CATEGORY_CONFIG, CreateObjectiveInput } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface NewObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateObjectiveInput) => void;
}

// Categories that typically need a starting value
const NEEDS_STARTING_VALUE: ObjectiveCategory[] = ['body', 'finance'];

export const NewObjectiveModal: React.FC<NewObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [category, setCategory] = useState<ObjectiveCategory>('mind');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [startingValue, setStartingValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');

  // Check if this category needs a starting value
  const needsStartingValue = NEEDS_STARTING_VALUE.includes(category) && targetValue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    // If needs starting value and not provided, show warning
    if (needsStartingValue && !startingValue) {
      return; // Form validation will handle this
    }

    onSubmit({
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      target_value: targetValue ? parseFloat(targetValue) : undefined,
      starting_value: startingValue ? parseFloat(startingValue) : undefined,
      current_value: startingValue ? parseFloat(startingValue) : 0,
      unit: unit.trim() || undefined,
      deadline: deadline || undefined,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setTargetValue('');
    setStartingValue('');
    setUnit('');
    setDeadline('');
    setCategory('mind');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo Obiettivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Categoria</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [ObjectiveCategory, typeof CATEGORY_CONFIG[ObjectiveCategory]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
                    category === key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <span className="text-lg">{config.emoji}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {config.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es: Perdere 5kg, Superare esame..."
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dettagli aggiuntivi..."
              rows={2}
            />
          </div>

          {/* Target Value & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="target">Obiettivo numerico</Label>
              <Input
                id="target"
                type="number"
                step="any"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Es: 70"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unità di misura</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Es: kg, libri, ore"
              />
            </div>
          </div>

          {/* Starting Value - Show for body/finance categories when target is set */}
          {needsStartingValue && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Punto di partenza
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Per calcolare correttamente i progressi, inserisci il valore attuale
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <Input
                id="starting"
                type="number"
                step="any"
                value={startingValue}
                onChange={(e) => setStartingValue(e.target.value)}
                placeholder={`Es: ${category === 'body' ? '75' : '1000'}`}
                required={!!needsStartingValue}
                className="bg-white dark:bg-card"
              />
                {unit && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {unit}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Deadline */}
          <div>
            <Label htmlFor="deadline">Scadenza (opzionale)</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim()}>
              Crea Obiettivo
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
