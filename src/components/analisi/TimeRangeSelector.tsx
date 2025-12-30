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
    <div className="relative bg-muted rounded-2xl p-1 flex">
      {/* Sliding pill background */}
      <div 
        className="absolute top-1 bottom-1 bg-card rounded-xl shadow-sm transition-all duration-300 ease-out"
        style={{
          width: `calc(${100 / ranges.length}% - 4px)`,
          left: `calc(${ranges.findIndex(r => r.value === value) * (100 / ranges.length)}% + 2px)`,
        }}
      />
      
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "relative flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors duration-200 z-10",
            value === range.value
              ? "text-foreground"
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
