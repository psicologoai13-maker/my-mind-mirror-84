import React from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CorrelationDataPoint {
  date: string;
  metric1: number;
  metric2: number;
}

interface CorrelationCardProps {
  title: string;
  metric1: {
    key: string;
    label: string;
    color: string;
  };
  metric2: {
    key: string;
    label: string;
    color: string;
  };
  data: CorrelationDataPoint[];
  correlation: 'positive' | 'negative' | 'neutral';
  insight?: string;
  className?: string;
}

const CorrelationCard: React.FC<CorrelationCardProps> = ({
  title,
  metric1,
  metric2,
  data,
  correlation,
  insight,
  className,
}) => {
  if (data.length < 3) {
    return null;
  }

  const correlationIcon = correlation === 'positive' ? TrendingUp : 
                          correlation === 'negative' ? TrendingDown : null;
  const correlationColor = correlation === 'positive' ? 'text-emerald-500' : 
                           correlation === 'negative' ? 'text-orange-500' : 'text-muted-foreground';
  const correlationLabel = correlation === 'positive' ? 'Correlazione positiva' : 
                           correlation === 'negative' ? 'Correlazione negativa' : 'Nessuna correlazione';

  return (
    <section className={cn("animate-fade-in mb-6", className)}>
      <div className={cn(
        "relative overflow-hidden rounded-3xl",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass p-5"
      )}>
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-medium bg-gradient-aria-subtle text-aria-violet rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        </div>

        {/* Legend */}
        <div className="relative z-10 flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: metric1.color }}
            />
            <span className="text-xs text-muted-foreground">{metric1.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: metric2.color }}
            />
            <span className="text-xs text-muted-foreground">{metric2.label}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="relative z-10 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${metric1.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric1.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={metric1.color} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id={`gradient-${metric2.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric2.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={metric2.color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 10]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="metric1"
                name={metric1.label}
                stroke={metric1.color}
                strokeWidth={2}
                fill={`url(#gradient-${metric1.key})`}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="metric2"
                name={metric2.label}
                stroke={metric2.color}
                strokeWidth={2}
                fill={`url(#gradient-${metric2.key})`}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Correlation indicator */}
        <div className="relative z-10 mt-4 pt-4 border-t border-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {correlationIcon && React.createElement(correlationIcon, { className: cn("w-4 h-4", correlationColor) })}
              <span className={cn("text-xs font-medium", correlationColor)}>
                {correlationLabel}
              </span>
            </div>
          </div>
          
          {insight && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {insight}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CorrelationCard;
