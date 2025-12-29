import React from 'react';
import { Clock, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UpcomingSession: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            Prossima sessione
          </span>
          <h3 className="font-semibold text-lg mt-3 text-gray-900">
            Sessione settimanale
          </h3>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
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
