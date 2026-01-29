import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TimeRange } from '@/pages/Analisi';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: 'day', label: 'Giorno' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'all', label: 'Tutto' },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeTab = container.querySelector(`[data-value="${value}"]`) as HTMLButtonElement;
    if (activeTab) {
      setIndicatorStyle({
        width: activeTab.offsetWidth,
        left: activeTab.offsetLeft,
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center w-full p-1.5 rounded-2xl",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass"
      )}
    >
      {/* Animated indicator - glass style */}
      <div
        className={cn(
          "absolute top-1.5 h-[calc(100%-12px)] rounded-xl",
          "bg-card shadow-glass-glow border border-border/50",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        )}
        style={{
          width: indicatorStyle.width,
          left: indicatorStyle.left,
        }}
      />

      {/* Tabs */}
      {ranges.map((range) => (
        <button
          key={range.value}
          data-value={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "relative z-10 flex-1 py-2.5 px-3 rounded-xl text-sm font-medium",
            "transition-colors duration-200",
            value === range.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;
