import React from 'react';
import { cn } from '@/lib/utils';

export type TimeRange = 'day' | 'week' | 'month' | 'all';

interface CompactTimeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
  hasTodayData?: boolean;
}

const ranges: { value: TimeRange; label: string }[] = [
  { value: 'day', label: 'Giorno' },
  { value: 'week', label: 'Settimana' },
  { value: 'month', label: 'Mese' },
  { value: 'all', label: 'Tutto' },
];

const CompactTimeSelector: React.FC<CompactTimeSelectorProps> = ({ 
  value, 
  onChange, 
  className,
  hasTodayData = true 
}) => {
  // Filter out 'day' if no data for today
  const availableRanges = ranges.filter(
    range => range.value !== 'day' || hasTodayData
  );

  return (
    <div className={cn("flex items-center gap-1 bg-muted/50 rounded-lg p-0.5", className)}>
      {availableRanges.map((range) => (
        <button
          key={range.value}
          onClick={(e) => {
            e.stopPropagation();
            onChange(range.value);
          }}
          className={cn(
            "px-2 py-1 rounded-md text-[10px] font-medium transition-all",
            value === range.value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default CompactTimeSelector;
