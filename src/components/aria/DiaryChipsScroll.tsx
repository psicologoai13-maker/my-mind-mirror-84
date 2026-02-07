import React from 'react';
import { Plus, Heart, Briefcase, Users, Sparkles } from 'lucide-react';
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

const DIARY_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  love: { icon: Heart, label: 'Amore' },
  work: { icon: Briefcase, label: 'Lavoro' },
  relationships: { icon: Users, label: 'Relazioni' },
  self: { icon: Sparkles, label: 'Me stesso' },
};

const DiaryChipsScroll: React.FC<DiaryChipsScrollProps> = ({
  activeDiaryIds,
  diaries,
  onOpenDiary,
  onAddDiary,
}) => {
  const customDiaries = JSON.parse(localStorage.getItem('customDiaries') || '{}');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      className="w-full max-w-sm mx-auto"
    >
      {/* Section Label */}
      <p className="text-center text-xs text-foreground/60 font-medium tracking-widest uppercase mb-4">
        I tuoi diari
      </p>
      
      {/* Diary Chips - Centered Grid */}
      <div className="flex flex-wrap justify-center gap-4">
        {activeDiaryIds.slice(0, 4).map((themeId, index) => {
          const config = DIARY_CONFIG[themeId];
          if (!config) return null;
          
          const customLabel = customDiaries[themeId];
          const Icon = config.icon;
          const label = customLabel || config.label;

          return (
            <motion.button
              key={themeId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 + index * 0.1 }}
              onClick={() => onOpenDiary(themeId)}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group flex flex-col items-center gap-2"
            >
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  "transition-all duration-400 ease-out"
                )}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <Icon className="w-5 h-5 text-foreground/60 group-hover:text-[hsl(var(--aria-violet))] transition-colors duration-300" />
              </div>
              <span className="text-[11px] text-foreground/60 font-medium tracking-wide group-hover:text-foreground transition-colors duration-300">
                {label}
              </span>
            </motion.button>
          );
        })}

        {/* Add Diary Button */}
        {activeDiaryIds.length < 6 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1 + activeDiaryIds.length * 0.1 }}
            onClick={onAddDiary}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group flex flex-col items-center gap-2"
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-400 ease-out"
              style={{
                background: 'transparent',
                border: '1px dashed rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Plus className="w-4 h-4 text-foreground/50 group-hover:text-[hsl(var(--aria-violet))] transition-colors duration-300" />
            </div>
            <span className="text-[11px] text-foreground/50 font-medium tracking-wide group-hover:text-foreground transition-colors duration-300">
              Aggiungi
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default DiaryChipsScroll;
