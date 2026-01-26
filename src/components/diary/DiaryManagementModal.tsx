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
import { Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiaryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDiaries: string[];
  onAddDiary: (theme: string, isCustom: boolean, customLabel?: string) => void;
  onRemoveDiary: (theme: string) => void;
}

const SUGGESTED_DIARIES = [
  { id: 'love', label: 'Amore', emoji: '❤️' },
  { id: 'work', label: 'Lavoro', emoji: '💼' },
  { id: 'relationships', label: 'Relazioni', emoji: '👥' },
  { id: 'self', label: 'Me Stesso', emoji: '✨' },
  { id: 'health', label: 'Salute', emoji: '💪' },
  { id: 'family', label: 'Famiglia', emoji: '👨‍👩‍👧' },
  { id: 'dreams', label: 'Sogni', emoji: '🌙' },
  { id: 'gratitude', label: 'Gratitudine', emoji: '🙏' },
];

const DiaryManagementModal: React.FC<DiaryManagementModalProps> = ({
  isOpen,
  onClose,
  activeDiaries,
  onAddDiary,
  onRemoveDiary,
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customEmoji, setCustomEmoji] = useState('📝');

  const availableSuggested = SUGGESTED_DIARIES.filter(
    d => !activeDiaries.includes(d.id)
  );

  const canAddMore = activeDiaries.length < 6;

  const handleAddCustom = () => {
    if (customLabel.trim() && canAddMore) {
      const customId = `custom_${customLabel.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      onAddDiary(customId, true, `${customEmoji} ${customLabel.trim()}`);
      setCustomLabel('');
      setCustomEmoji('📝');
      setShowCustomInput(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center">Gestisci Diari</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Active Diaries */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Diari Attivi ({activeDiaries.length}/6)
            </Label>
            <div className="space-y-2">
              {activeDiaries.map(diaryId => {
                const suggested = SUGGESTED_DIARIES.find(d => d.id === diaryId);
                const label = suggested ? `${suggested.emoji} ${suggested.label}` : diaryId;
                
                return (
                  <div
                    key={diaryId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                  >
                    <span className="font-medium">{label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveDiary(diaryId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Suggested */}
          {canAddMore && availableSuggested.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Suggeriti
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {availableSuggested.slice(0, 4).map(diary => (
                  <button
                    key={diary.id}
                    onClick={() => onAddDiary(diary.id, false)}
                    className="flex items-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors text-left"
                  >
                    <span className="text-lg">{diary.emoji}</span>
                    <span className="text-sm font-medium">{diary.label}</span>
                    <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Diary */}
          {canAddMore && (
            <div>
              {!showCustomInput ? (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Diario Personalizzato
                </Button>
              ) : (
                <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                  <div className="flex gap-2">
                    <Input
                      value={customEmoji}
                      onChange={e => setCustomEmoji(e.target.value)}
                      className="w-16 text-center text-lg"
                      maxLength={2}
                    />
                    <Input
                      value={customLabel}
                      onChange={e => setCustomLabel(e.target.value)}
                      placeholder="Nome del diario..."
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setShowCustomInput(false)}
                    >
                      Annulla
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAddCustom}
                      disabled={!customLabel.trim()}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Aggiungi
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!canAddMore && (
            <p className="text-sm text-muted-foreground text-center">
              Hai raggiunto il limite di 6 diari. Rimuovine uno per aggiungerne altri.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiaryManagementModal;
