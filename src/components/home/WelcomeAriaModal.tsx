import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles, Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeAriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}

const WelcomeAriaModal: React.FC<WelcomeAriaModalProps> = ({ 
  open, 
  onOpenChange, 
  userName 
}) => {
  const navigate = useNavigate();

  const handleStartChat = () => {
    onOpenChange(false);
    navigate('/aria');
  };

  const handleLater = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto p-0 bg-transparent border-none shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-card rounded-3xl p-6 shadow-elevated border border-border overflow-hidden relative"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Avatar */}
            <div className="flex justify-center mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-glass-glow">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Heart className="w-4 h-4 text-primary-foreground" />
                </motion.div>
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-6"
            >
              <h2 className="text-xl font-bold text-foreground mb-2">
                Ciao {userName}! 👋
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sono <span className="text-primary font-medium">Aria</span>, la tua nuova compagna di viaggio.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                Facciamo due chiacchiere per conoscerti meglio?
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 mb-6"
            >
              {[
                { emoji: '💬', text: 'Parlami di te, sono curiosa!' },
                { emoji: '🎯', text: 'Ti aiuterò con i tuoi obiettivi' },
                { emoji: '🤗', text: 'Nessun giudizio, solo supporto' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50"
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              <Button
                onClick={handleStartChat}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-base font-semibold shadow-glass-glow"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Parliamo!
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleLater}
                className="w-full text-muted-foreground text-sm"
              >
                Più tardi
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeAriaModal;
