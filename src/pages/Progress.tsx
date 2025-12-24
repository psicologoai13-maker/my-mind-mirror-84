import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Award, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const monthlyData = [
  { week: 'Sett 1', mood: 3.2, satisfaction: 3.5 },
  { week: 'Sett 2', mood: 3.8, satisfaction: 3.7 },
  { week: 'Sett 3', mood: 4.0, satisfaction: 4.2 },
  { week: 'Sett 4', mood: 4.3, satisfaction: 4.5 },
];

const areaBreakdown = [
  { name: 'Amicizia', value: 72, color: 'hsl(200, 65%, 55%)' },
  { name: 'Amore', value: 65, color: 'hsl(340, 70%, 60%)' },
  { name: 'Lavoro', value: 80, color: 'hsl(45, 75%, 50%)' },
  { name: 'Benessere', value: 75, color: 'hsl(150, 50%, 50%)' },
];

const sessionsData = [
  { day: 'L', sessions: 1 },
  { day: 'M', sessions: 2 },
  { day: 'M', sessions: 1 },
  { day: 'G', sessions: 3 },
  { day: 'V', sessions: 2 },
  { day: 'S', sessions: 1 },
  { day: 'D', sessions: 0 },
];

const stats = [
  { icon: TrendingUp, label: 'Miglioramento', value: '+18%', color: 'text-mood-excellent' },
  { icon: Target, label: 'Obiettivi', value: '8/10', color: 'text-primary' },
  { icon: Award, label: 'Streak', value: '12 giorni', color: 'text-area-work' },
  { icon: Calendar, label: 'Sessioni', value: '24', color: 'text-area-love' },
];

const Progress: React.FC = () => {
  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">I tuoi progressi</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitora il tuo percorso di crescita</p>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up">
          {stats.map((stat, index) => {
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
            Trend mensile
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  dataKey="week" 
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
        </div>

        {/* Life Areas Breakdown */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-3">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Aree di vita
          </h3>
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
        </div>

        {/* Sessions per Week */}
        <div className="bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-4">
          <h3 className="font-display font-semibold text-lg mb-4 text-foreground">
            Sessioni questa settimana
          </h3>
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
                Il tuo umore è migliorato del 18% rispetto alla scorsa settimana! 
                Le sessioni del giovedì sembrano essere particolarmente efficaci per te.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Progress;
