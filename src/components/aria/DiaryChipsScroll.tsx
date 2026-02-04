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

const DIARY_CONFIG: Record<string, { icon: React.ReactNode; gradient: string }> = {
  love: { 
    icon: <Heart className="w-6 h-6" />, 
    gradient: 'from-rose-400/80 to-pink-400/80'
  },
  work: { 
    icon: <Briefcase className="w-6 h-6" />, 
    gradient: 'from-amber-400/80 to-orange-400/80'
  },
  relationships: { 
    icon: <Users className="w-6 h-6" />, 
    gradient: 'from-sky-400/80 to-blue-400/80'
  },
  self: { 
    icon: <User className="w-6 h-6" />, 
    gradient: 'from-emerald-400/80 to-teal-400/80'
  },
};

const DiaryChipsScroll: React.FC<DiaryChipsScrollProps> = ({
  activeDiaryIds,
  diaries,
  onOpenDiary,
  onAddDiary,
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
      className="w-full space-y-3"
    >
      {/* Subtle label */}
      <p className="text-center text-xs text-muted-foreground/40 tracking-widest uppercase">
        I tuoi diari
      </p>
      {/* Larger horizontal row */}
      <div className="flex items-center justify-center gap-5">
        {activeDiaryIds.slice(0, 4).map((themeId, index) => {
          const config = DIARY_CONFIG[themeId];
          
          if (!config) return null;

          return (
            <motion.button
              key={themeId}
              onClick={() => onOpenDiary(themeId)}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                "bg-glass/40 backdrop-blur-sm border border-glass-border/20",
                "hover:bg-glass/60 hover:border-[hsl(var(--aria-violet)/0.25)]",
                "hover:shadow-[0_0_15px_rgba(155,111,208,0.12)]",
                "transition-all duration-300",
                "active:scale-95"
              )}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                `bg-gradient-to-br ${config.gradient}`,
                "text-white/90"
              )}>
                {config.icon}
              </div>
            </motion.button>
          );
        })}

        {/* Add button - subtle */}
        {activeDiaryIds.length < 6 && (
          <motion.button
            onClick={onAddDiary}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-transparent border border-dashed border-muted-foreground/20",
              "hover:border-[hsl(var(--aria-violet)/0.3)] hover:bg-glass/30",
              "transition-all duration-300",
              "text-muted-foreground/40 hover:text-muted-foreground/60"
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
            whileHover={{ y: -2 }}
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        )}
      </div>
    </motion.section>
  );
};

export default DiaryChipsScroll;
