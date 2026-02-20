import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface WelcomeBackBannerProps {
  daysSinceLastSession: number;
  userName: string;
  onDismiss: () => void;
}

const WelcomeBackBanner: React.FC<WelcomeBackBannerProps> = ({ 
  daysSinceLastSession, 
  userName,
  onDismiss 
}) => {
  const navigate = useNavigate();

  const getMessage = () => {
    if (daysSinceLastSession >= 14) {
      return `Bentornato ${userName}! Sono passate più di 2 settimane. Aria è qui per te, raccontale come stai.`;
    }
    if (daysSinceLastSession >= 7) {
      return `Ehi ${userName}! È passata una settimana. Aria non vede l'ora di sapere come stai.`;
    }
    return `Bentornato ${userName}! Sono passati ${daysSinceLastSession} giorni. Come stai?`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="relative card-glass p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
    >
      <button 
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Chiudi"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="pr-6">
        <p className="text-sm font-medium text-foreground mb-3">
          {getMessage()}
        </p>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-full bg-gradient-aria text-white shadow-aria-glow text-xs h-8 px-4"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
            Scrivi ad Aria
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-xs h-8 px-4"
            onClick={() => navigate('/aria')}
          >
            <Mic className="w-3.5 h-3.5 mr-1.5" />
            Parla con Aria
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default WelcomeBackBanner;
