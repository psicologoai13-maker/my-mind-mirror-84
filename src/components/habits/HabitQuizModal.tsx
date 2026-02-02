import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import HabitCreationChat from './HabitCreationChat';

interface HabitQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHabitCreated: () => void;
}

const HabitQuizModal: React.FC<HabitQuizModalProps> = ({
  isOpen,
  onClose,
  onHabitCreated,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-glass-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Nuova Abitudine
          </DialogTitle>
        </DialogHeader>
        
        <HabitCreationChat
          onHabitCreated={() => {
            onHabitCreated();
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default HabitQuizModal;
