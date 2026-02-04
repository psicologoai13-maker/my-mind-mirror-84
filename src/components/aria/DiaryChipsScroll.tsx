import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { ThematicDiary, DiaryTheme } from '@/hooks/useThematicDiaries';

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

      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
        <div className="flex gap-2.5 pb-1">
          {activeDiaryIds.map((diaryId, index) => {
            const diary = diaries?.find(d => d.theme === diaryId);
            const { emoji, label } = getDiaryLabel(diaryId);
            const hasActivity = diary && diary.last_updated_at;
            
            return (
              <motion.button
                key={diaryId}
                onClick={() => onOpenDiary(diaryId)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap",
                  "bg-glass backdrop-blur-xl border border-glass-border",
                  "shadow-glass hover:shadow-glass-glow",
                  "transition-all duration-300",
                  "active:scale-[0.97]"
                )}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Inner highlight */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                
                <span className="text-base relative z-10">{emoji}</span>
                <span className="font-medium text-sm text-foreground relative z-10">{label}</span>
                
                {/* Activity dot */}
                {hasActivity && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary absolute -top-0.5 -right-0.5" />
                )}
              </motion.button>
            );
          })}

          {/* Add Diary Button */}
          {activeDiaryIds.length < 6 && (
            <motion.button
              onClick={onAddDiary}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-2xl",
                "bg-glass backdrop-blur-xl border border-glass-border border-dashed",
                "text-muted-foreground hover:text-primary hover:border-primary/30",
                "transition-all duration-300",
                "active:scale-[0.95]"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: activeDiaryIds.length * 0.05 }}
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
};

export default DiaryChipsScroll;
