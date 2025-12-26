import React from 'react';
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
  return (
    <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200",
            value === range.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;