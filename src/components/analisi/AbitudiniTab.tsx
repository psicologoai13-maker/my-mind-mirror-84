import React from 'react';
import { useHabitsAnalytics, HabitAnalytics } from '@/hooks/useHabitsAnalytics';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { Flame, TrendingUp, TrendingDown, Minus, Trophy, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface HabitTrendCardProps {
  habit: HabitAnalytics;
}

const HabitTrendCard: React.FC<HabitTrendCardProps> = ({ habit }) => {
  const TrendIcon = () => {
    if (habit.trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (habit.trend === 'down') return <TrendingDown className="w-4 h-4 text-orange-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Prepare chart data
  const chartData = habit.dailyData.map(d => ({
    date: format(new Date(d.date), 'dd/MM', { locale: it }),
    value: d.value,
  }));

  // Choose appropriate visualization based on input method
  const renderChart = () => {
    if (chartData.length === 0) return null;

    // For range/counter habits (sigarette, caffè), use bar chart
    if (habit.inputMethod === 'range' || habit.inputMethod === 'counter' || habit.inputMethod === 'numeric') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '10px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [
                habit.unit ? `${value} ${habit.unit}` : value,
                habit.label
              ]}
            />
            <Bar
              dataKey="value"
              fill={habit.color}
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // For toggle/abstain habits, use area chart showing consistency
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${habit.habitType}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={habit.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={habit.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
          />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '10px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [
              habit.isAbstain 
                ? (value === 0 ? '✓ OK' : '✗ Ceduto')
                : (value > 0 ? '✓ Fatto' : '—'),
              habit.label
            ]}
          />
          <Area
            type="stepAfter"
            dataKey="value"
            stroke={habit.color}
            strokeWidth={2}
            fill={`url(#gradient-${habit.habitType})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${habit.color}15` }}
          >
            <span className="text-lg">{habit.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{habit.label}</h3>
            <p className="text-xs text-muted-foreground">
              {habit.totalDays} giorni tracciati
            </p>
          </div>
        </div>
        <TrendIcon />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-24 mb-3">
          {renderChart()}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/20">
        {/* Streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="text-sm font-bold text-foreground">{habit.currentStreak}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Streak</p>
        </div>

        {/* Best Streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-sm font-bold text-foreground">{habit.bestStreak}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Record</p>
        </div>

        {/* Active Days or Average */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-blue-500" />
            <span className="text-sm font-bold text-foreground">
              {habit.isAbstain || habit.inputMethod === 'toggle'
                ? `${Math.round((habit.activeDays / Math.max(habit.totalDays, 1)) * 100)}%`
                : habit.averageValue
              }
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {habit.isAbstain || habit.inputMethod === 'toggle' ? 'Successo' : 'Media'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface AbitudiniTabProps {
  lookbackDays?: number;
}

const AbitudiniTab: React.FC<AbitudiniTabProps> = ({ lookbackDays = 30 }) => {
  const { habits, isLoading } = useHabitsAnalytics(lookbackDays);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium text-foreground mb-2">Nessuna abitudine tracciata</h3>
        <p className="text-sm text-muted-foreground">
          Inizia a tracciare le tue abitudini dalla Home o dalla sezione Progressi.
        </p>
      </div>
    );
  }

  // Separate habits by type for better organization
  const abstainHabits = habits.filter(h => h.isAbstain);
  const toggleHabits = habits.filter(h => h.inputMethod === 'toggle' && !h.isAbstain);
  const countableHabits = habits.filter(h => 
    ['counter', 'numeric', 'range'].includes(h.inputMethod) && !h.isAbstain
  );

  return (
    <div className="space-y-5">
      {/* Countable Habits (sigarette, acqua, etc.) */}
      {countableHabits.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <span>📊</span> Misurazioni
          </h2>
          <div className="space-y-4">
            {countableHabits.map(habit => (
              <HabitTrendCard key={habit.habitType} habit={habit} />
            ))}
          </div>
        </section>
      )}

      {/* Abstain Habits (no smoking, no junk food) */}
      {abstainHabits.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <span>🚫</span> Vizi da evitare
          </h2>
          <div className="space-y-4">
            {abstainHabits.map(habit => (
              <HabitTrendCard key={habit.habitType} habit={habit} />
            ))}
          </div>
        </section>
      )}

      {/* Toggle Habits (yoga, meditation, exercise) */}
      {toggleHabits.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1 flex items-center gap-2">
            <span>✅</span> Attività quotidiane
          </h2>
          <div className="space-y-4">
            {toggleHabits.map(habit => (
              <HabitTrendCard key={habit.habitType} habit={habit} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AbitudiniTab;
