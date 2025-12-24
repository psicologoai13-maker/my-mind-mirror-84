import React from 'react';
import { Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpcomingSession: React.FC = () => {
  return (
    <div className="bg-gradient-calm rounded-3xl p-6 shadow-soft border border-border/50 animate-slide-up stagger-5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-primary bg-primary-light px-2 py-1 rounded-full">
            Prossima sessione
          </span>
          <h3 className="font-display font-semibold text-lg mt-3 text-foreground">
            Sessione settimanale
          </h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Domani, 15:00</span>
            </div>
            <div className="flex items-center gap-1">
              <Video className="w-4 h-4" />
              <span>30 min</span>
            </div>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl">🧠</span>
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="outline" size="sm" className="flex-1">
          Riprogramma
        </Button>
        <Button variant="default" size="sm" className="flex-1">
          Unisciti ora
        </Button>
      </div>
    </div>
  );
};

export default UpcomingSession;
