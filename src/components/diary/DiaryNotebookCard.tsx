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
      className="w-full p-4 rounded-3xl bg-card shadow-premium hover:shadow-lg hover:scale-[1.02] transition-all duration-300 text-left group"
    >
      {/* Icon circle */}
      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-lg mb-3">
        {themeConfig.emoji}
      </div>
      
      {/* Title */}
      <h3 className="font-display font-semibold text-foreground text-base">
        {themeConfig.label}
      </h3>
      
      {/* Subtitle */}
      <p className="text-xs text-muted-foreground mt-1">
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
