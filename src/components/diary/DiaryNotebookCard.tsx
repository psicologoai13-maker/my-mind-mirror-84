import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiaryTheme, ThematicDiary, DIARY_THEMES } from '@/hooks/useThematicDiaries';

interface DiaryNotebookCardProps {
  theme: DiaryTheme;
  diary?: ThematicDiary;
  onClick: () => void;
}

const DiaryNotebookCard: React.FC<DiaryNotebookCardProps> = ({ theme, diary, onClick }) => {
  const themeConfig = DIARY_THEMES.find(t => t.theme === theme)!;
  const hasMessages = diary && diary.messages.length > 0;
  const lastMessage = diary?.last_message_preview;
  
  return (
    <button
      onClick={onClick}
      className="relative w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 text-left group"
    >
      {/* Emoji badge */}
      <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-xl">
        {themeConfig.emoji}
      </div>
      
      <div className="pr-8">
        <h3 className={cn("font-semibold text-gray-900 mb-1", themeConfig.color)}>
          {themeConfig.label}
        </h3>
        
        {hasMessages ? (
          <p className="text-xs text-gray-500 line-clamp-2">
            {lastMessage || 'Inizia a scrivere...'}
          </p>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Inizia il tuo diario
          </p>
        )}
      </div>
      
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
      
      {/* Unread indicator */}
      {hasMessages && (
        <div className="absolute bottom-3 left-4">
          <span className="text-[10px] text-muted-foreground">
            {diary.messages.length} messaggi
          </span>
        </div>
      )}
    </button>
  );
};

export default DiaryNotebookCard;
