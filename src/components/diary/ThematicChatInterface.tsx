import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiaryTheme, ThematicDiary, DIARY_THEMES, useThematicDiaries } from '@/hooks/useThematicDiaries';
import { toast } from 'sonner';

interface ThematicChatInterfaceProps {
  theme: DiaryTheme;
  diary?: ThematicDiary;
  onBack: () => void;
}

const ThematicChatInterface: React.FC<ThematicChatInterfaceProps> = ({ 
  theme, 
  diary, 
  onBack 
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendMessage } = useThematicDiaries();
  const themeConfig = DIARY_THEMES.find(t => t.theme === theme)!;
  
  const messages = diary?.messages || [];
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    const messageText = input.trim();
    setInput('');
    setIsSending(true);
    
    try {
      await sendMessage.mutateAsync({ theme, message: messageText });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
      setInput(messageText); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Theme-specific colors
  const themeColors: Record<DiaryTheme, { bg: string; accent: string; headerBg: string }> = {
    love: { 
      bg: 'bg-gradient-to-b from-rose-50/50 to-background dark:from-rose-950/10',
      accent: 'bg-rose-500',
      headerBg: 'bg-rose-50/80 dark:bg-rose-950/30'
    },
    work: { 
      bg: 'bg-gradient-to-b from-blue-50/50 to-background dark:from-blue-950/10',
      accent: 'bg-blue-500',
      headerBg: 'bg-blue-50/80 dark:bg-blue-950/30'
    },
    relationships: { 
      bg: 'bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10',
      accent: 'bg-amber-500',
      headerBg: 'bg-amber-50/80 dark:bg-amber-950/30'
    },
    self: { 
      bg: 'bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/10',
      accent: 'bg-emerald-500',
      headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/30'
    },
  };

  const colors = themeColors[theme];

  return (
    <div className={cn("flex flex-col h-full", colors.bg)}>
      {/* Header */}
      <header className={cn(
        "px-4 py-3 border-b border-border/50 flex items-center gap-3",
        colors.headerBg,
        "backdrop-blur-sm"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-2xl">{themeConfig.emoji}</span>
          <div>
            <h1 className="font-display font-semibold text-foreground">
              Diario {themeConfig.label}
            </h1>
            <p className="text-xs text-muted-foreground">
              {messages.length} messaggi
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-5xl mb-4">{themeConfig.emoji}</span>
            <h2 className="font-semibold text-foreground mb-2">
              Il tuo Diario {themeConfig.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              Scrivi i tuoi pensieri, emozioni e riflessioni su questo tema. 
              L'AI ricorderà tutto per le prossime conversazioni.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl animate-fade-in",
                msg.role === 'user' 
                  ? "ml-auto bg-primary text-primary-foreground rounded-tr-none" 
                  : "mr-auto bg-muted text-foreground rounded-tl-none"
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))
        )}
        
        {isSending && (
          <div className="max-w-[85%] mr-auto px-4 py-3 rounded-2xl rounded-tl-none bg-muted">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 pb-6">
        <div className="flex items-end gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-soft">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Scrivi nel tuo diario ${themeConfig.label.toLowerCase()}...`}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground max-h-24"
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={cn(
              "shrink-0 rounded-full w-9 h-9",
              colors.accent,
              "text-white hover:opacity-90"
            )}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThematicChatInterface;
