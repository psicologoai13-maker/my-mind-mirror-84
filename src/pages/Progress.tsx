import React from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import MoodAnxietyChart from '@/components/progress/MoodAnxietyChart';
import ActivityHeatmap from '@/components/progress/ActivityHeatmap';
import LifeWheelRadar from '@/components/progress/LifeWheelRadar';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MessageCircle, TrendingUp, Calendar, Mic, Star, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckins } from '@/hooks/useCheckins';
import { useSessions, Session } from '@/hooks/useSessions';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

const EMOTION_COLORS: Record<string, string> = {
  'Gioia': 'hsl(45, 90%, 55%)',
  'Tristezza': 'hsl(220, 60%, 55%)',
  'Rabbia': 'hsl(0, 70%, 55%)',
  'Paura': 'hsl(280, 50%, 50%)',
  'Ansia': 'hsl(30, 80%, 55%)',
  'Serenità': 'hsl(170, 50%, 50%)',
  'Frustrazione': 'hsl(15, 70%, 50%)',
  'Speranza': 'hsl(100, 50%, 50%)',
  'Confusione': 'hsl(260, 40%, 55%)',
  'Entusiasmo': 'hsl(320, 70%, 55%)',
};

const getEmotionColor = (emotion: string): string => {
  return EMOTION_COLORS[emotion] || 'hsl(220, 20%, 50%)';
};

const formatSessionDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  const days = differenceInDays(new Date(), date);
  if (days < 7) return format(date, 'EEEE', { locale: it });
  return format(date, 'd MMM', { locale: it });
};

const Progress: React.FC = () => {
  const { weeklyCheckins } = useCheckins();
  const { completedSessions, stats } = useSessions();
  
  // Calculate aggregated emotion breakdown from all sessions
  const aggregatedEmotions: Record<string, number> = {};
  completedSessions.forEach(session => {
    if (session.emotion_breakdown) {
      Object.entries(session.emotion_breakdown).forEach(([emotion, value]) => {
        aggregatedEmotions[emotion] = (aggregatedEmotions[emotion] || 0) + value;
      });
    }
  });
  
  // Normalize to percentages
  const totalEmotions = Object.values(aggregatedEmotions).reduce((a, b) => a + b, 0);
  const emotionData = Object.entries(aggregatedEmotions)
    .map(([name, value]) => ({
      name,
      value: totalEmotions > 0 ? Math.round((value / totalEmotions) * 100) : 0,
      color: getEmotionColor(name),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  
  const hasEmotionData = emotionData.length > 0;

  // Get recent sessions with key events
  const recentSessions = completedSessions.slice(0, 8);

  // Calculate average mood trend
  const hasCheckinData = weeklyCheckins && weeklyCheckins.length > 0;
  const averageMood = hasCheckinData 
    ? (weeklyCheckins.reduce((acc, c) => acc + c.mood_value, 0) / weeklyCheckins.length).toFixed(1)
    : '--';

  // Get latest insight from sessions
  const latestInsight = completedSessions.find(s => s.insights)?.insights;

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">I tuoi progressi</h1>
        <p className="text-muted-foreground text-sm mt-1">Evoluzione nel tempo</p>
      </header>

      <div className="px-4 space-y-4 pb-8">
        {/* 1. Mood vs Anxiety Combined Chart - Full Width */}
        <div className="animate-fade-in">
          <MoodAnxietyChart />
        </div>

        {/* 2. Activity Heatmap - Full Width */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <ActivityHeatmap />
        </div>

        {/* 3. Life Wheel Radar with Ghost Line - Full Width */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <LifeWheelRadar />
        </div>

        {/* Grid: Emotions + Stats */}
        <div className="grid grid-cols-2 gap-3">
          {/* Emotion Donut Chart */}
          <div className="bg-card rounded-3xl p-4 shadow-card border border-border/30 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <h3 className="font-display font-semibold text-sm text-foreground mb-3">Emozioni</h3>
            
            {!hasEmotionData ? (
              <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
                <span className="text-3xl mb-2">💭</span>
                <p className="text-xs">Nessun dato</p>
              </div>
            ) : (
              <>
                <div className="h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={emotionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {emotionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-foreground">{emotionData[0]?.value || 0}%</span>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {emotionData.slice(0, 3).map(emotion => (
                    <div key={emotion.name} className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: emotion.color }}
                      />
                      <span className="text-xs text-muted-foreground truncate flex-1">{emotion.name}</span>
                      <span className="text-xs font-medium text-foreground">{emotion.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-3xl p-4 shadow-card border border-border/30 space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-display font-semibold text-sm text-foreground">Statistiche</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-foreground">{stats.totalSessions}</p>
                  <p className="text-[10px] text-muted-foreground">Sessioni</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-foreground">{averageMood}</p>
                  <p className="text-[10px] text-muted-foreground">Umore medio</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-foreground">{weeklyCheckins?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Check-in</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        {latestInsight && (
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl p-5 border border-primary/20 animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-display font-semibold text-foreground mb-1">Insight AI</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{latestInsight}</p>
              </div>
            </div>
          </div>
        )}

        {/* Session Timeline */}
        <div className="bg-card rounded-3xl p-5 shadow-card border border-border/30 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-display font-semibold text-lg text-foreground mb-4">Timeline Sessioni</h3>
          
          {recentSessions.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                <Mic className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">Nessuna sessione ancora</p>
              <p className="text-xs text-center mt-1">Inizia una sessione vocale per vedere la tua timeline</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {recentSessions.map((session, index) => (
                  <SessionTimelineItem key={session.id} session={session} index={index} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

// Timeline Item Component
const SessionTimelineItem: React.FC<{ session: Session; index: number }> = ({ session, index }) => {
  const hasKeyEvents = session.key_events && session.key_events.length > 0;
  const moodScore = session.mood_score_detected;
  const isVoice = session.type === 'voice';
  
  const getMoodColor = (score: number | null) => {
    if (!score) return 'bg-muted';
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-400';
  };

  return (
    <div 
      className="relative pl-10 animate-fade-in"
      style={{ animationDelay: `${0.4 + index * 0.05}s` }}
    >
      {/* Timeline dot */}
      <div className={cn(
        "absolute left-2 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-card",
        hasKeyEvents ? 'bg-primary' : getMoodColor(moodScore)
      )}>
        {hasKeyEvents ? (
          <Star className="w-3 h-3 text-primary-foreground" />
        ) : isVoice ? (
          <Mic className="w-2.5 h-2.5 text-white" />
        ) : (
          <MessageCircle className="w-2.5 h-2.5 text-white" />
        )}
      </div>
      
      {/* Content */}
      <div className="bg-muted/30 rounded-2xl p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">
            {formatSessionDate(session.start_time)}
          </span>
          {moodScore && (
            <span className={cn(
              "text-xs font-bold",
              moodScore >= 70 ? 'text-emerald-500' : moodScore >= 40 ? 'text-amber-500' : 'text-red-400'
            )}>
              {moodScore}%
            </span>
          )}
        </div>
        
        {session.ai_summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {session.ai_summary}
          </p>
        )}
        
        {hasKeyEvents && (
          <div className="mt-2 flex flex-wrap gap-1">
            {session.key_events.slice(0, 2).map((event, i) => (
              <span 
                key={i} 
                className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {event}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Progress;
