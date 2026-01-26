import React from 'react';
import { ObjectiveCategory, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';

interface CategoryChipsProps {
  selected: ObjectiveCategory | 'all';
  onSelect: (category: ObjectiveCategory | 'all') => void;
  counts?: Record<ObjectiveCategory | 'all', number>;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selected,
  onSelect,
  counts,
}) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect('all')}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
          selected === 'all'
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        Tutti
        {counts?.all !== undefined && (
          <span className="text-xs opacity-70">({counts.all})</span>
        )}
      </button>

      {(Object.entries(CATEGORY_CONFIG) as [ObjectiveCategory, typeof CATEGORY_CONFIG[ObjectiveCategory]][]).map(([key, config]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
            selected === key
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span>{config.emoji}</span>
          {config.label}
          {counts?.[key] !== undefined && counts[key] > 0 && (
            <span className="text-xs opacity-70">({counts[key]})</span>
          )}
        </button>
      ))}
    </div>
  );
};
