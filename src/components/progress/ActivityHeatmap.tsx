import React, { useMemo } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import { format, subDays, eachDayOfInterval, isSameDay, getDay, startOfWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const ActivityHeatmap: React.FC = () => {
  const { completedSessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 90); // Last 90 days
    
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    return days.map(day => {
      // Find sessions for this day
      const daySessions = completedSessions.filter(s => 
        isSameDay(new Date(s.start_time), day)
      );
      
      // Find check-in for this day
      const dayCheckin = weeklyCheckins?.find(c => 
        isSameDay(new Date(c.created_at), day)
      );
      
      // Calculate intensity (0-4 scale like GitHub)
      let intensity = 0;
      if (daySessions.length > 0 || dayCheckin) {
        // Base intensity from having activity
        intensity = 1;
        
        // Add more based on mood
        if (dayCheckin) {
          intensity = Math.min(4, Math.ceil(dayCheckin.mood_value * 0.8));
        } else if (daySessions.length > 0) {
          const avgMood = daySessions.reduce((acc, s) => acc + (s.mood_score_detected || 50), 0) / daySessions.length;
          intensity = Math.min(4, Math.ceil((avgMood / 100) * 4));
        }
        
        // Boost if multiple sessions
        if (daySessions.length > 1) {
          intensity = Math.min(4, intensity + 1);
        }
      }
      
      return {
        date: day,
        formattedDate: format(day, 'd MMM', { locale: it }),
        dayOfWeek: getDay(day),
        intensity,
        sessions: daySessions.length,
        hasCheckin: !!dayCheckin,
      };
    });
  }, [completedSessions, weeklyCheckins]);

  // Group by weeks for grid layout
  const weeks = useMemo(() => {
    const result: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      // New week starts on Monday (dayOfWeek === 0 is Sunday in JS, we use Monday as start)
      if (day.dayOfWeek === 0 || index === heatmapData.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    
    return result;
  }, [heatmapData]);

  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-muted/40';
      case 1: return 'bg-emerald-200 dark:bg-emerald-900/40';
      case 2: return 'bg-emerald-300 dark:bg-emerald-700/60';
      case 3: return 'bg-emerald-400 dark:bg-emerald-600/80';
      case 4: return 'bg-emerald-500 dark:bg-emerald-500';
      default: return 'bg-muted/40';
    }
  };

  const totalActiveDays = heatmapData.filter(d => d.intensity > 0).length;
  const totalSessions = heatmapData.reduce((acc, d) => acc + d.sessions, 0);

  return (
    <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Attività</h3>
            <p className="text-xs text-muted-foreground">Ultimi 90 giorni</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">{totalActiveDays}</p>
          <p className="text-[10px] text-muted-foreground">giorni attivi</p>
        </div>
      </div>
      
      {/* Heatmap Grid */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-1 min-w-fit">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn(
                    "w-3 h-3 rounded-sm transition-colors",
                    getIntensityColor(day.intensity)
                  )}
                  title={`${day.formattedDate}: ${day.sessions} sessioni${day.hasCheckin ? ', check-in' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[10px] text-muted-foreground">Meno</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(intensity => (
            <div
              key={intensity}
              className={cn("w-3 h-3 rounded-sm", getIntensityColor(intensity))}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Più</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
