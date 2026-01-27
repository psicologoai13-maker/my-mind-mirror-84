import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useBodyMetrics } from '@/hooks/useBodyMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingDown, TrendingUp, Minus, Scale, Check, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const WeightCard: React.FC = () => {
  const { latestWeight, weightTrend, weightChartData, logMetrics } = useBodyMetrics();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState<string>(latestWeight?.toString() || '');
  const [isLogging, setIsLogging] = useState(false);

  const handleSubmit = async () => {
    const weight = parseFloat(inputValue);
    if (isNaN(weight) || weight <= 0) {
      toast.error('Inserisci un peso valido');
      return;
    }

    setIsLogging(true);
    try {
      await logMetrics.mutateAsync({ weight });
      toast.success('Peso registrato');
      setIsEditing(false);
    } catch (error) {
      toast.error('Errore nel salvare');
    } finally {
      setIsLogging(false);
    }
  };

  const TrendIcon = weightTrend.trend === 'down' 
    ? TrendingDown 
    : weightTrend.trend === 'up' 
    ? TrendingUp 
    : Minus;

  const trendColor = weightTrend.trend === 'down' 
    ? 'text-emerald-500' 
    : weightTrend.trend === 'up' 
    ? 'text-red-500' 
    : 'text-muted-foreground';

  // Prepare chart data with min/max for better visualization
  const chartMin = Math.min(...weightChartData.map(d => d.value)) - 1;
  const chartMax = Math.max(...weightChartData.map(d => d.value)) + 1;

  return (
    <div className="p-5 rounded-3xl bg-card border border-border/50 shadow-premium">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Peso</h3>
            <p className="text-xs text-muted-foreground">Ultimo 30gg</p>
          </div>
        </div>
        
        {/* Trend Badge */}
        {weightTrend.change !== null && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            weightTrend.trend === 'down' && "bg-emerald-100 dark:bg-emerald-900/30",
            weightTrend.trend === 'up' && "bg-red-100 dark:bg-red-900/30",
            weightTrend.trend === 'stable' && "bg-muted"
          )}>
            <TrendIcon className={cn("w-3 h-3", trendColor)} />
            <span className={trendColor}>
              {weightTrend.change > 0 ? '+' : ''}{weightTrend.change.toFixed(1)} kg
            </span>
          </div>
        )}
      </div>

      {/* Current Weight Display */}
      {isEditing ? (
        <div className="flex items-center gap-2 mb-4">
          <Input
            type="number"
            step="0.1"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Es: 73.5"
            className="h-12 text-xl text-center font-bold"
            autoFocus
          />
          <Button 
            onClick={handleSubmit}
            disabled={isLogging}
            className="h-12 px-4"
          >
            <Check className="w-5 h-5" />
          </Button>
        </div>
      ) : (
        <div 
          className="flex items-baseline gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => {
            setInputValue(latestWeight?.toString() || '');
            setIsEditing(true);
          }}
        >
          {latestWeight !== null ? (
            <>
              <span className="text-4xl font-bold text-foreground">
                {latestWeight.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground">kg</span>
              <Edit2 className="w-4 h-4 text-muted-foreground ml-2" />
            </>
          ) : (
            <Button variant="outline" className="w-full">
              <Scale className="w-4 h-4 mr-2" />
              Registra il primo peso
            </Button>
          )}
        </div>
      )}

      {/* Mini Sparkline Chart */}
      {weightChartData.length > 1 && (
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weightChartData}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[chartMin, chartMax]} hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#weightGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats Row */}
      {weightTrend.previous !== null && weightTrend.current !== null && (
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
          <span>30gg fa: {weightTrend.previous.toFixed(1)} kg</span>
          <span>Oggi: {weightTrend.current.toFixed(1)} kg</span>
        </div>
      )}
    </div>
  );
};

export default WeightCard;
