import React from 'react';
import { cn } from '@/lib/utils';
import { DiaryTheme, ThematicDiary, DIARY_THEMES } from '@/hooks/useThematicDiaries';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DiaryNotebookCardProps {
  theme: DiaryTheme;
  diary?: ThematicDiary;
  onClick: () => void;
}

const DiaryNotebookCard: React.FC<DiaryNotebookCardProps> = ({ theme, diary, onClick }) => {
  const themeConfig = DIARY_THEMES.find(t => t.theme === theme)!;
  const hasMessages = diary && diary.messages.length > 0;
  
  // Get last updated date
  const lastUpdated = diary?.last_updated_at 
    ? format(new Date(diary.last_updated_at), 'd MMM', { locale: it })
    : null;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden w-full p-4 rounded-3xl text-left group",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass hover:shadow-glass-elevated",
        "hover:scale-[1.02] transition-all duration-300"
      )}
    >
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Icon circle */}
      <div className="relative z-10 w-10 h-10 rounded-2xl bg-muted/50 backdrop-blur-sm flex items-center justify-center text-lg mb-3">
        {themeConfig.emoji}
      </div>
      
      {/* Title */}
      <h3 className="relative z-10 font-display font-semibold text-foreground text-base">
        {themeConfig.label}
      </h3>
      
      {/* Subtitle */}
      <p className="relative z-10 text-xs text-muted-foreground mt-1">
        {hasMessages ? (
          lastUpdated ? `Ultima modifica: ${lastUpdated}` : `${diary.messages.length} messaggi`
        ) : (
          'Inizia a scrivere'
        )}
      </p>
    </button>
  );
};

export default DiaryNotebookCard;
