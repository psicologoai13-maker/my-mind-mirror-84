import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, Zap, Link2 } from 'lucide-react';
import { 
  OBJECTIVE_TYPES, 
  ObjectiveMeta, 
  ObjectiveCategory,
  getAllCategories,
  getObjectivesByCategory,
  isAutoSyncObjective,
  isAIDetectable,
} from '@/lib/objectiveTypes';

interface ObjectiveSelectionGridProps {
  onSelect: (objective: ObjectiveMeta) => void;
  onCustom: () => void;
}

export const ObjectiveSelectionGrid: React.FC<ObjectiveSelectionGridProps> = ({
  onSelect,
  onCustom,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ObjectiveCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  
  const categories = getAllCategories();
  
  const filteredObjectives = Object.values(OBJECTIVE_TYPES).filter(obj => {
    const matchesCategory = selectedCategory === 'all' || obj.category === selectedCategory;
    const matchesSearch = search === '' || 
      obj.label.toLowerCase().includes(search.toLowerCase()) ||
      obj.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getInputMethodBadge = (objective: ObjectiveMeta) => {
    if (isAutoSyncObjective(objective.inputMethod)) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <Link2 className="h-2.5 w-2.5 mr-0.5" />
          Auto
        </Badge>
      );
    }
    if (isAIDetectable(objective.inputMethod)) {
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          AI
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca obiettivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl bg-muted/50"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            selectedCategory === 'all'
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          Tutti
        </button>
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Objectives Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1">
        {filteredObjectives.map(objective => (
          <button
            key={objective.key}
            onClick={() => onSelect(objective)}
            className={cn(
              "relative p-3 rounded-2xl text-left transition-all",
              "bg-glass backdrop-blur-sm border border-glass-border",
              "hover:bg-muted/50 hover:border-primary/30 hover:-translate-y-0.5",
              "active:scale-[0.98]"
            )}
          >
            {/* Badge in corner */}
            <div className="absolute top-2 right-2">
              {getInputMethodBadge(objective)}
            </div>
            
            <div className="text-2xl mb-1">{objective.emoji}</div>
            <h4 className="font-medium text-sm text-foreground line-clamp-1">
              {objective.label}
            </h4>
            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
              {objective.description}
            </p>
            {objective.unit && (
              <span className="text-[10px] text-primary font-medium">
                {objective.unit}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Custom Objective Button */}
      <button
        onClick={onCustom}
        className={cn(
          "w-full p-4 rounded-2xl transition-all",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          "border-2 border-dashed border-primary/30",
          "hover:border-primary/50 hover:from-primary/15",
          "flex items-center justify-center gap-2"
        )}
      >
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-medium text-primary">Obiettivo Personalizzato</span>
      </button>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link2 className="h-3 w-3 text-emerald-500" />
          <span>Sync automatico</span>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-purple-500" />
          <span>Rilevato da Aria</span>
        </div>
      </div>
    </div>
  );
};
