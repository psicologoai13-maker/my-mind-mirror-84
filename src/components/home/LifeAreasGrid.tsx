import React from 'react';
import { Heart, Users, Briefcase, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';

const areaConfig = [
  { 
    key: 'friendship',
    icon: Users, 
    label: 'Amicizia', 
    color: 'bg-area-friendship',
    bgLight: 'bg-blue-50',
  },
  { 
    key: 'love',
    icon: Heart, 
    label: 'Amore', 
    color: 'bg-area-love',
    bgLight: 'bg-pink-50',
  },
  { 
    key: 'work',
    icon: Briefcase, 
    label: 'Lavoro', 
    color: 'bg-area-work',
    bgLight: 'bg-amber-50',
  },
  { 
    key: 'wellness',
    icon: Sparkles, 
    label: 'Benessere', 
    color: 'bg-area-wellness',
    bgLight: 'bg-emerald-50',
  },
];

const LifeAreasGrid: React.FC = () => {
  const { profile, isLoading } = useProfile();
  
  const areas = areaConfig.map(area => {
    const scores = profile?.life_areas_scores as Record<string, number> | undefined;
    const value = scores?.[area.key] || 0;
    return {
      ...area,
      value,
      trend: value > 50 ? `+${Math.floor(Math.random() * 10)}%` : '-',
    };
  });

  if (isLoading) {
    return (
      <div className="animate-slide-up stagger-2">
        <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
          Le tue aree di vita
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl p-4 shadow-soft animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  const hasData = areas.some(a => a.value > 0);

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
                  <Icon className="w-5 h-5" style={{ color: `hsl(var(--area-${area.key === 'friendship' ? 'friendship' : area.key}))` }} />
                </div>
                {hasData && area.value > 50 && (
                  <span className="text-xs font-medium text-mood-good">{area.trend}</span>
                )}
              </div>
              <h4 className="font-medium text-foreground mb-2">{area.label}</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-display font-bold text-foreground">
                  {hasData ? `${area.value}%` : '--'}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", area.color)}
                    style={{ width: hasData ? `${area.value}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!hasData && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          I dati verranno aggiornati dopo le tue sessioni
        </p>
      )}
    </div>
  );
};

export default LifeAreasGrid;
