import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageCircle, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateOverlayProps {
  onStartCheckin?: () => void;
  className?: string;
}

const EmptyStateOverlay: React.FC<EmptyStateOverlayProps> = ({ 
  onStartCheckin,
  className 
}) => {
  const navigate = useNavigate();

  const handleTalkToAria = () => {
    navigate('/aria');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6",
        "bg-gradient-to-br from-aria-violet/10 via-aria-indigo/5 to-background",
        "border border-aria-violet/20",
        className
      )}
    >
      {/* Subtle aurora glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-aria-violet/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-aria-indigo/15 rounded-full blur-2xl" />

      <div className="relative z-10">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-aria flex items-center justify-center shadow-aria-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-5">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Iniziamo il tuo percorso!
          </h3>
          <p className="text-sm text-muted-foreground">
            Fai un check-in o parla con Aria per vedere i tuoi progressi qui
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleTalkToAria}
            className="w-full h-11 rounded-full bg-gradient-aria text-white font-medium shadow-aria-glow hover:shadow-elevated transition-all group"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Parla con Aria
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
          </Button>

          {onStartCheckin && (
            <Button
              variant="outline"
              onClick={onStartCheckin}
              className="w-full h-10 rounded-full border-aria-violet/30 text-foreground/80 hover:bg-aria-violet/10"
            >
              <Target className="w-4 h-4 mr-2 text-aria-violet" />
              Fai un check-in veloce
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EmptyStateOverlay;
