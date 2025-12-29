import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Calendar, BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const actions = [
  { 
    icon: MessageCircle, 
    label: 'Parla ora', 
    description: 'Inizia una sessione',
    path: '/chat',
    variant: 'hero' as const
  },
  { 
    icon: Calendar, 
    label: 'Prenota', 
    description: 'Programma sessione',
    path: '/sessions',
    variant: 'outline' as const
  },
  { 
    icon: BookOpen, 
    label: 'Diario', 
    description: 'Scrivi i tuoi pensieri',
    path: '/journal',
    variant: 'outline' as const
  },
  { 
    icon: Zap, 
    label: 'Esercizi', 
    description: 'Tecniche rapide',
    path: '/exercises',
    variant: 'outline' as const
  },
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-slide-up stagger-3">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">
        Azioni rapide
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.variant}
              className={cn(
                "h-auto py-4 flex flex-col items-start gap-2",
                action.variant === 'hero' && "col-span-2"
              )}
              onClick={() => navigate(action.path)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Icon className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">{action.label}</p>
                <p className={cn(
                  "text-xs",
                  action.variant === 'hero' ? "text-white/80" : "text-gray-500"
                )}>
                  {action.description}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
