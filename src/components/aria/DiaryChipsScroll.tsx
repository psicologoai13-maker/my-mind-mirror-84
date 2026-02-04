import React from 'react';
import { Plus, Heart, Briefcase, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Diary {
  id: string;
  theme: string;
  last_message_preview?: string | null;
}

interface DiaryChipsScrollProps {
  activeDiaryIds: string[];
  diaries?: Diary[] | null;
  onOpenDiary: (theme: string) => void;
  onAddDiary: () => void;
}

const DIARY_CONFIG: Record<string, { icon: React.ReactNode; label: string; gradient: string }> = {
  love: { 
    icon: <Heart className="w-7 h-7" />, 
    label: 'Amore',
    gradient: 'from-rose-500 to-pink-500'
  },
  work: { 
    icon: <Briefcase className="w-7 h-7" />, 
    label: 'Lavoro',
    gradient: 'from-amber-500 to-orange-500'
  },
  relationships: { 
    icon: <Users className="w-7 h-7" />, 
    label: 'Relazioni',
    gradient: 'from-sky-500 to-blue-500'
  },
  self: { 
    icon: <User className="w-7 h-7" />, 
    label: 'Me stesso',
    gradient: 'from-emerald-500 to-teal-500'
  },
};

const DiaryChipsScroll: React.FC<DiaryChipsScrollProps> = ({
  activeDiaryIds,
  diaries,
  onOpenDiary,
  onAddDiary,
}) => {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-sm text-muted-foreground">I tuoi diari</h2>
        {activeDiaryIds.length < 6 && (
          <button
            onClick={onAddDiary}
            className="text-xs text-primary font-medium flex items-center gap-1 hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Aggiungi
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {activeDiaryIds.slice(0, 4).map((themeId, index) => {
          const config = DIARY_CONFIG[themeId];
          const diary = diaries?.find(d => d.theme === themeId);
          
          if (!config) return null;

          return (
            <motion.button
              key={themeId}
              onClick={() => onOpenDiary(themeId)}
              className={cn(
                "flex flex-col items-center justify-center gap-3 p-5 rounded-2xl",
                "bg-glass/70 backdrop-blur-xl border border-glass-border/50",
                "hover:shadow-glass-glow hover:border-primary/30",
                "transition-all duration-300",
                "active:scale-[0.95]"
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                `bg-gradient-to-br ${config.gradient}`,
                "text-white shadow-lg"
              )}>
                {config.icon}
              </div>
              <span className="text-xs font-semibold text-foreground truncate w-full text-center">
                {config.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default DiaryChipsScroll;
