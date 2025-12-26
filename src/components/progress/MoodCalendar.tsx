import React, { useMemo, useState } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useCheckins } from '@/hooks/useCheckins';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayData {
  date: Date;
  mood: number | null;
  sessions: number;
  hasCheckin: boolean;
}

const MoodCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { completedSessions } = useSessions();
  const { weeklyCheckins } = useCheckins();

  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(day => {
      const daySessions = completedSessions.filter(s => isSameDay(new Date(s.start_time), day));
      const dayCheckin = weeklyCheckins?.find(c => isSameDay(new Date(c.created_at), day));

      let mood: number | null = null;
      if (dayCheckin) {
        mood = (dayCheckin.mood_value / 5) * 100;
      } else if (daySessions.length > 0) {
        const avgMood = daySessions.reduce((acc, s) => acc + (s.mood_score_detected || 50), 0) / daySessions.length;
        mood = avgMood * 10;
      }

      return {
        date: day,
        mood,
        sessions: daySessions.length,
        hasCheckin: !!dayCheckin,
      } as DayData;
    });
  }, [currentMonth, completedSessions, weeklyCheckins]);

  const getMoodColor = (mood: number | null): string => {
    if (mood === null) return 'bg-muted/30';
    if (mood >= 70) return 'bg-emerald-400';
    if (mood >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getMoodLabel = (mood: number | null): string => {
    if (mood === null) return 'Nessun dato';
    if (mood >= 70) return 'Buono';
    if (mood >= 40) return 'Nella media';
    return 'Difficile';
  };

  // Calculate padding days for calendar grid
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startDayOfWeek = getDay(firstDayOfMonth);
  // Adjust for Monday start (Italian calendar)
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

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

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[100px] text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <TooltipProvider>
        <div className="grid grid-cols-7 gap-1">
          {/* Padding days */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}

          {/* Actual days */}
          {calendarData.map(dayData => {
            const isToday = isSameDay(dayData.date, new Date());
            const hasActivity = dayData.mood !== null;

            return (
              <Tooltip key={dayData.date.toISOString()}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center relative cursor-default transition-all',
                      isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-card'
                    )}
                  >
                    <span className="text-[11px] text-muted-foreground font-medium z-10">
                      {format(dayData.date, 'd')}
                    </span>
                    {hasActivity && (
                      <div
                        className={cn(
                          'absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full',
                          getMoodColor(dayData.mood)
                        )}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{format(dayData.date, 'd MMMM', { locale: it })}</p>
                    <p className="text-muted-foreground">
                      Umore: {getMoodLabel(dayData.mood)}
                      {dayData.mood !== null && ` (${Math.round(dayData.mood)}%)`}
                    </p>
                    {dayData.sessions > 0 && (
                      <p className="text-muted-foreground">{dayData.sessions} sessioni</p>
                    )}
                    {dayData.hasCheckin && (
                      <p className="text-primary">✓ Check-in completato</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/20">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-muted-foreground">Buono</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-[10px] text-muted-foreground">Nella media</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[10px] text-muted-foreground">Difficile</span>
        </div>
      </div>
    </div>
  );
};

export default MoodCalendar;