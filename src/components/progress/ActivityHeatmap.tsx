import React, { useMemo } from 'react';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { subDays, format, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Activity } from 'lucide-react';

interface DayData {
  date: Date;
  formattedDate: string;
  dayOfWeek: number;
  intensity: number;
  hasData: boolean;
}

const ActivityHeatmap: React.FC = () => {
  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const startDate = subDays(new Date(), 90);
  const endDate = new Date();
  const { metricsRange } = useDailyMetricsRange(startDate, endDate);

  const heatmapData = useMemo(() => {
    return metricsRange.map(dayMetrics => {
      const day = new Date(dayMetrics.date);
      const hasData = dayMetrics.has_checkin || dayMetrics.has_sessions || dayMetrics.has_emotions || dayMetrics.has_life_areas;
      
      // Calculate intensity (0-4 scale like GitHub) based on mood and activity
      let intensity = 0;
      if (hasData) {
        intensity = 1; // Base intensity for any activity
        
        // Use mood from unified source (1-10 scale)
        if (dayMetrics.vitals.mood > 0) {
          intensity = Math.min(4, Math.ceil((dayMetrics.vitals.mood / 10) * 4));
        }
        
        // Boost if has multiple data sources
        const sourcesCount = [
          dayMetrics.has_checkin,
          dayMetrics.has_sessions,
          dayMetrics.has_emotions,
          dayMetrics.has_life_areas
        ].filter(Boolean).length;
        
        if (sourcesCount > 1) {
          intensity = Math.min(4, intensity + 1);
        }
      }
      
      return {
        date: day,
        formattedDate: format(day, 'd MMM', { locale: it }),
        dayOfWeek: getDay(day),
        intensity,
        hasData,
      } as DayData;
    });
  }, [metricsRange]);

  // Group by weeks
  const weeks = useMemo(() => {
    const result: DayData[][] = [];
    let currentWeek: DayData[] = [];
    
    heatmapData.forEach((day, index) => {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
      
      if (index === heatmapData.length - 1) {
        result.push(currentWeek);
      }
    });
    
    return result;
  }, [heatmapData]);

  const getIntensityColor = (intensity: number) => {
    switch (intensity) {
      case 0: return 'bg-muted/30';
      case 1: return 'bg-primary/20';
      case 2: return 'bg-primary/40';
      case 3: return 'bg-primary/60';
      case 4: return 'bg-primary/80';
      default: return 'bg-muted/30';
    }
  };

  const activeDays = heatmapData.filter(d => d.hasData).length;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Attività</h3>
            <p className="text-xs text-muted-foreground">Ultimi 90 giorni</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-foreground">{activeDays}</span>
          <p className="text-[10px] text-muted-foreground">giorni attivi</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(day.intensity)}`}
                title={`${day.formattedDate}: ${day.hasData ? 'Attivo' : 'Inattivo'}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-[10px] text-muted-foreground mr-1">Meno</span>
        {[0, 1, 2, 3, 4].map(intensity => (
          <div key={intensity} className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`} />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1">Più</span>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
