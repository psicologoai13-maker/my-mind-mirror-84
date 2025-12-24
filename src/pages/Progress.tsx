import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';

const Progress: React.FC = () => {
  const { weeklyChartData, weeklyCheckins } = useCheckins();
  const { profile } = useProfile();
  const { completedSessions, stats } = useSessions();
  
  // Calculate stats from real data
  const hasCheckinData = weeklyCheckins && weeklyCheckins.length > 0;
  const hasSessionData = completedSessions && completedSessions.length > 0;
  
  const improvement = hasCheckinData 
    ? Math.round((weeklyCheckins[weeklyCheckins.length - 1]?.mood_value || 0) / 5 * 100 - 50) 
    : 0;

  const wellnessScore = profile?.wellness_score || 0;
  
  const lifeAreasScores = profile?.life_areas_scores as Record<string, number> | undefined;
  const areaBreakdown = [
    { name: 'Amicizia', value: lifeAreasScores?.friendship || 0, color: 'hsl(200, 65%, 55%)' },
    { name: 'Amore', value: lifeAreasScores?.love || 0, color: 'hsl(340, 70%, 60%)' },
    { name: 'Lavoro', value: lifeAreasScores?.work || 0, color: 'hsl(45, 75%, 50%)' },
    { name: 'Benessere', value: lifeAreasScores?.wellness || 0, color: 'hsl(150, 50%, 50%)' },
  ];
  
  const hasAreaData = areaBreakdown.some(a => a.value > 0);

  // Sessions per day of week
  const sessionsData = ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => {
    const sessionsOnDay = completedSessions.filter(s => {
      const d = new Date(s.start_time);
      return d.getDay() === (index === 6 ? 0 : index + 1);
    }).length;
    return { day, sessions: sessionsOnDay };
  });

  // Monthly trend (use weekly data for now)
  const monthlyData = weeklyChartData.map((d, i) => ({
    week: `Sett ${i + 1}`,
    mood: d.mood || 0,
    satisfaction: d.satisfaction || 0,
  }));

  const statsList = [
    { 
      icon: TrendingUp, 
      label: 'Miglioramento', 
      value: improvement > 0 ? `+${improvement}%` : (improvement < 0 ? `${improvement}%` : '--'), 
      color: improvement > 0 ? 'text-mood-excellent' : 'text-muted-foreground' 
    },
    { 
      icon: Target, 
      label: 'Obiettivi', 
      value: wellnessScore > 0 ? `${Math.round(wellnessScore / 10)}/10` : '--', 
      color: 'text-primary' 
    },
    { 
      icon: Award, 
      label: 'Streak', 
      value: hasCheckinData ? `${weeklyCheckins.length} giorni` : '--', 
      color: 'text-area-work' 
    },
    { 
      icon: Calendar, 
      label: 'Sessioni', 
      value: stats.totalSessions > 0 ? stats.totalSessions.toString() : '--', 
      color: 'text-area-love' 
    },
  ];

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">I tuoi progressi</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitora il tuo percorso di crescita</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up">
          {statsList.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-card rounded-2xl p-4 shadow-soft"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon className={cn("w-5 h-5 mb-2", stat.color)} />
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Monthly Trend */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-2">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Trend settimanale
          </h3>
          {!hasCheckinData ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">📈</span>
              <p className="text-sm">Nessun dato ancora</p>
              <p className="text-xs">Registra il tuo umore per vedere il trend</p>
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="progressMoodGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(150, 30%, 45%)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(150, 30%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="progressSatisfactionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(260, 40%, 60%)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(260, 40%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 11 }}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(150, 30%, 45%)"
                    strokeWidth={2}
                    fill="url(#progressMoodGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="satisfaction"
                    stroke="hsl(260, 40%, 60%)"
                    strokeWidth={2}
                    fill="url(#progressSatisfactionGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Life Areas Breakdown */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-3">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Aree di vita
          </h3>
          {!hasAreaData ? (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">🎯</span>
              <p className="text-sm">Nessun dato ancora</p>
              <p className="text-xs">Completa sessioni per vedere i progressi</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={areaBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {areaBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {areaBreakdown.map((area) => (
                  <div key={area.name} className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="text-sm text-foreground flex-1">{area.name}</span>
                    <span className="text-sm font-semibold text-foreground">{area.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sessions per Week */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-4">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Sessioni questa settimana
          </h3>
          {!hasSessionData ? (
            <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">💬</span>
              <p className="text-sm">Nessuna sessione ancora</p>
              <p className="text-xs">Inizia una chat per vedere le statistiche</p>
            </div>
          ) : (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sessionsData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: 'hsl(220, 10%, 50%)', fontSize: 12 }}
                  />
                  <Bar 
                    dataKey="sessions" 
                    fill="hsl(150, 30%, 45%)" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-gradient-calm rounded-3xl p-6 border border-border/50 animate-slide-up stagger-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h4 className="font-display font-semibold text-foreground mb-1">Insight della settimana</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {hasCheckinData || hasSessionData 
                  ? `Hai registrato ${weeklyCheckins?.length || 0} check-in e completato ${completedSessions.length} sessioni questa settimana. Continua così!`
                  : 'Inizia a registrare il tuo umore e completare sessioni per ricevere insight personalizzati sul tuo percorso.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Progress;
