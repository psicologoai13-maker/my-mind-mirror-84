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
      <DialogContent className="max-w-[340px] mx-auto p-0 bg-transparent border-none shadow-none mb-24 sm:mb-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="card-glass p-6 overflow-hidden relative"
        >
          {/* Aurora gradient background - Aria identity */}
          <div className="absolute inset-0 bg-gradient-aria-subtle opacity-60 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-aria-violet/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-aria-indigo/15 blur-2xl" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Aria Avatar */}
            <div className="flex justify-center mb-5">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", delay: 0.15, stiffness: 200 }}
                className="relative"
              >
                {/* Outer glow ring */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-aria blur-xl opacity-40"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
                
                {/* Main avatar */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
                  <Sparkles className="w-10 h-10 text-white" />
                  
                  {/* Orbiting particles */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-white/80" />
                    <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-white/60" />
                    <div className="absolute -bottom-0.5 left-1/4 w-1 h-1 rounded-full bg-white/50" />
                  </motion.div>
                </div>
                
                {/* Online indicator */}
                <motion.div
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Stars className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              </motion.div>
            </div>

            {/* Welcome text */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-center mb-5"
            >
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Ciao {userName}! ✨
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sono <span className="font-semibold bg-gradient-aria bg-clip-text text-transparent">Aria</span>, 
                la tua compagna di benessere.
              </p>
              <p className="text-foreground/80 text-sm leading-relaxed mt-3 font-medium">
                Iniziamo con una chiacchierata per conoscerti meglio?
              </p>
            </motion.div>

            {/* Features - più compatti */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="space-y-2 mb-5"
            >
              {[
                { emoji: '🌟', text: 'Racconta di te, delle tue giornate' },
                { emoji: '🎯', text: 'Personalizzerò il tuo percorso' },
                { emoji: '💜', text: 'Zero giudizi, solo supporto' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-secondary/60 backdrop-blur-sm border border-border/30"
                >
                  <span className="text-base">{item.emoji}</span>
                  <span className="text-sm text-foreground/90">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="space-y-2.5"
            >
              <Button
                onClick={handleStartChat}
                className="w-full h-13 rounded-full bg-gradient-aria text-white text-base font-semibold shadow-aria-glow hover:shadow-elevated transition-all duration-300 group"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Iniziamo a conoscerci
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleStartChat}
                  className="flex-1 h-11 rounded-full border-border/50 text-sm font-medium hover:bg-secondary/80"
                >
                  <Mic className="w-4 h-4 mr-1.5" />
                  Preferisco parlare
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLater}
                  className="flex-1 h-11 rounded-full text-muted-foreground text-sm"
                >
                  Dopo
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
