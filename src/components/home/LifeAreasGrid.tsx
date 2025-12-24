import React from 'react';
import { Heart, Users, Briefcase, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const areas = [
  { 
    icon: Users, 
    label: 'Amicizia', 
    value: 72, 
    color: 'bg-area-friendship',
    bgLight: 'bg-blue-50',
    trend: '+5%' 
  },
  { 
    icon: Heart, 
    label: 'Amore', 
    value: 65, 
    color: 'bg-area-love',
    bgLight: 'bg-pink-50',
    trend: '+2%' 
  },
  { 
    icon: Briefcase, 
    label: 'Lavoro', 
    value: 80, 
    color: 'bg-area-work',
    bgLight: 'bg-amber-50',
    trend: '+8%' 
  },
  { 
    icon: Sparkles, 
    label: 'Benessere', 
    value: 75, 
    color: 'bg-area-wellness',
    bgLight: 'bg-emerald-50',
    trend: '+3%' 
  },
];

const LifeAreasGrid: React.FC = () => {
  return (
    <div className="animate-slide-up stagger-2">
      <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
        Le tue aree di vita
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {areas.map((area, index) => {
          const Icon = area.icon;
          return (
            <div
              key={area.label}
              className={cn(
                "bg-card rounded-2xl p-4 shadow-soft hover:shadow-card transition-all duration-300",
                "hover:scale-[1.02] cursor-pointer"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-xl", area.bgLight)}>
                  <Icon className={cn("w-5 h-5", `text-${area.label.toLowerCase()}`)} style={{ color: `hsl(var(--area-${area.label.toLowerCase()}))` }} />
                </div>
                <span className="text-xs font-medium text-mood-good">{area.trend}</span>
              </div>
              <h4 className="font-medium text-foreground mb-2">{area.label}</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-display font-bold text-foreground">{area.value}%</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", area.color)}
                    style={{ width: `${area.value}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LifeAreasGrid;
