import React from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles, ArrowRight, Stars, Mic } from 'lucide-react';
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
      <DialogContent className="max-w-[280px] mx-auto p-0 bg-transparent border-none shadow-none fixed bottom-36 left-1/2 -translate-x-1/2 top-auto translate-y-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="card-glass p-4 overflow-hidden relative rounded-2xl"
        >
          {/* Aurora gradient background */}
          <div className="absolute inset-0 bg-gradient-aria-subtle opacity-50 pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Aria Avatar - più piccolo */}
            <div className="flex justify-center mb-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                className="relative"
              >
                <div className="relative w-12 h-12 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Stars className="w-2 h-2 text-primary-foreground" />
                </motion.div>
              </motion.div>
            </div>

            {/* Welcome text - compatto */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-3"
            >
              <h2 className="text-lg font-bold text-foreground mb-1">
                Ciao {userName}! ✨
              </h2>
              <p className="text-muted-foreground text-xs">
                Sono <span className="font-semibold text-aria-violet">Aria</span>, la tua compagna di benessere.
              </p>
            </motion.div>

            {/* Features - super compatti */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-1 mb-3"
            >
              {[
                { emoji: '🌟', text: 'Raccontami di te' },
                { emoji: '🎯', text: 'Personalizzerò il percorso' },
                { emoji: '💜', text: 'Zero giudizi' },
              ].map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/50"
                >
                  <span className="text-xs">{item.emoji}</span>
                  <span className="text-[11px] text-foreground/80">{item.text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons - layout corretto */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              {/* Main CTA */}
              <Button
                onClick={handleStartChat}
                className="w-full h-10 rounded-full bg-gradient-aria text-white text-xs font-semibold shadow-aria-glow hover:shadow-elevated transition-all group"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                Iniziamo a conoscerci
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              
              {/* Secondary row: Voice + Later */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleStartChat}
                  className="flex-1 h-9 rounded-full border-border/40 text-[11px] font-medium bg-background/50"
                >
                  <Mic className="w-3 h-3 mr-1" />
                  Preferisco parlare
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLater}
                  className="h-9 px-3 rounded-full text-muted-foreground text-[11px] hover:bg-secondary/50"
                >
                  Più tardi
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeAriaModal;
