import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { ThematicDiary } from '@/hooks/useThematicDiaries';

// Extended diary themes
const ALL_DIARY_THEMES = [
  { id: 'love', label: 'Amore', emoji: '❤️' },
  { id: 'work', label: 'Lavoro', emoji: '💼' },
  { id: 'relationships', label: 'Relazioni', emoji: '👥' },
  { id: 'self', label: 'Me Stesso', emoji: '✨' },
  { id: 'health', label: 'Salute', emoji: '💪' },
  { id: 'family', label: 'Famiglia', emoji: '👨‍👩‍👧' },
  { id: 'dreams', label: 'Sogni', emoji: '🌙' },
  { id: 'gratitude', label: 'Gratitudine', emoji: '🙏' },
];

interface DiaryChipsScrollProps {
  activeDiaryIds: string[];
  diaries?: ThematicDiary[];
  onOpenDiary: (theme: string) => void;
  onAddDiary: () => void;
}

const DiaryChipsScroll: React.FC<DiaryChipsScrollProps> = ({
  activeDiaryIds,
  diaries,
  onOpenDiary,
  onAddDiary,
}) => {
  const getDiaryLabel = (id: string) => {
    const suggested = ALL_DIARY_THEMES.find(d => d.id === id);
    if (suggested) return { emoji: suggested.emoji, label: suggested.label };
    
    const customDiaries = JSON.parse(localStorage.getItem('customDiaries') || '{}');
    if (customDiaries[id]) {
      const parts = customDiaries[id].split(' ');
      return { emoji: parts[0], label: parts.slice(1).join(' ') };
    }
    
    return { emoji: '📝', label: id };
  };

  return (
    <section className="px-5">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📔</span>
        <h2 className="font-display font-semibold text-sm text-foreground">I Tuoi Diari</h2>
      </div>

      {/* 2x2 Grid for bigger diary cards */}
      <div className="grid grid-cols-2 gap-3">
        {activeDiaryIds.slice(0, 4).map((diaryId, index) => {
          const diary = diaries?.find(d => d.theme === diaryId);
          const { emoji, label } = getDiaryLabel(diaryId);
          const hasActivity = diary && diary.last_updated_at;
          
          return (
            <motion.button
              key={diaryId}
              onClick={() => onOpenDiary(diaryId)}
              className={cn(
                "relative flex items-center gap-3 px-4 py-4 rounded-2xl text-left",
                "bg-glass backdrop-blur-xl border border-glass-border",
                "shadow-glass hover:shadow-glass-glow",
                "transition-all duration-300",
                "active:scale-[0.98]"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Inner highlight */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
              
              <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">{emoji}</span>
              </div>
              <span className="font-semibold text-sm text-foreground relative z-10">{label}</span>
              
              {/* Activity dot */}
              {hasActivity && (
                <span className="w-2 h-2 rounded-full bg-primary absolute top-2 right-2" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Add more button if less than 4 */}
      {activeDiaryIds.length < 4 && (
        <motion.button
          onClick={onAddDiary}
          className={cn(
            "w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl",
            "bg-glass/50 border border-dashed border-glass-border",
            "text-muted-foreground hover:text-primary hover:border-primary/30",
            "transition-all duration-200"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Aggiungi diario</span>
        </motion.button>
      )}
    </section>
  );
};

export default DiaryChipsScroll;
