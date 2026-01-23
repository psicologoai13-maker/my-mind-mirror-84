import React, { useMemo, useState } from 'react';
import { useDailyMetricsRange } from '@/hooks/useDailyMetrics';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DayData {
  date: Date;
  mood: number | null;
  hasData: boolean;
}

const MoodCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 🎯 SINGLE SOURCE OF TRUTH: Use the unified RPC hook
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const { metricsRange } = useDailyMetricsRange(monthStart, monthEnd);

  const calendarData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      // Find metrics for this day
      const dayMetrics = metricsRange.find(m => isSameDay(new Date(m.date), day));
      
      let mood: number | null = null;
      let hasData = false;
      
      if (dayMetrics && (dayMetrics.has_checkin || dayMetrics.has_sessions)) {
        hasData = true;
        // Mood is 1-10 scale, convert to 0-100 for color gradient
        if (dayMetrics.vitals.mood > 0) {
          mood = dayMetrics.vitals.mood * 10;
        }
      }

      return {
        date: day,
        mood,
        hasData,
      } as DayData;
    });
  }, [monthStart, monthEnd, metricsRange]);

  const getMoodColor = (mood: number | null): string => {
    if (mood === null) return 'bg-muted/30';
    if (mood >= 70) return 'bg-emerald-400';
    if (mood >= 50) return 'bg-yellow-400';
    if (mood >= 30) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getMoodLabel = (mood: number | null): string => {
    if (mood === null) return 'Nessun dato';
    if (mood >= 70) return 'Ottimo';
    if (mood >= 50) return 'Buono';
    if (mood >= 30) return 'Così così';
    return 'Difficile';
  };

  // Get the weekday of the first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = getDay(monthStart);
  // Adjust for Monday start (in Italian calendar Monday is first)
  const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Calendario Umore</h3>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[100px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </span>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <TooltipProvider>
        <div className="grid grid-cols-7 gap-1">
          {/* Padding days */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`padding-${i}`} className="aspect-square" />
          ))}
          
          {/* Actual days */}
          {calendarData.map((day, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <div 
                  className={`aspect-square rounded-md flex items-center justify-center text-xs cursor-default transition-colors ${
                    day.hasData ? getMoodColor(day.mood) : 'bg-muted/30'
                  } ${day.hasData ? 'text-white font-medium' : 'text-muted-foreground'}`}
                >
                  {format(day.date, 'd')}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{format(day.date, 'd MMMM', { locale: it })}</p>
                <p className="text-xs text-muted-foreground">
                  {getMoodLabel(day.mood)}
                  {day.mood !== null && ` (${Math.round(day.mood)}%)`}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        {[
          { color: 'bg-muted/30', label: 'Nessun dato' },
          { color: 'bg-red-400', label: 'Difficile' },
          { color: 'bg-orange-400', label: 'Così così' },
          { color: 'bg-yellow-400', label: 'Buono' },
          { color: 'bg-emerald-400', label: 'Ottimo' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoodCalendar;
