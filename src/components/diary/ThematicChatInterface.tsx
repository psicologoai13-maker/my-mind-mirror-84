import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiaryTheme, ThematicDiary, DIARY_THEMES, useThematicDiaries } from '@/hooks/useThematicDiaries';
import { toast } from 'sonner';
import ChatBubble from '@/components/chat/ChatBubble';

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

  // Theme-specific colors (clean, no gradients)
  const themeColors: Record<DiaryTheme, { accent: string }> = {
    love: { accent: 'bg-rose-500' },
    work: { accent: 'bg-blue-500' },
    relationships: { accent: 'bg-amber-500' },
    self: { accent: 'bg-emerald-500' },
  };

  const colors = themeColors[theme];

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-xl">
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
            <h1 className="font-semibold text-gray-900">
              Diario {themeConfig.label}
            </h1>
            <p className="text-xs text-gray-500">
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
            <h2 className="font-semibold text-gray-900 mb-2">
              Il tuo Diario {themeConfig.label}
            </h2>
            <p className="text-sm text-gray-500">
              Scrivi i tuoi pensieri, emozioni e riflessioni su questo tema. 
              L'AI ricorderà tutto per le prossime conversazioni.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              role={msg.role}
              timestamp={new Date(msg.timestamp)}
            />
          ))
        )}
        
        {isSending && (
          <div className="flex gap-2 animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed at bottom with safe area */}
      <div className="sticky bottom-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Scrivi nel tuo diario ${themeConfig.label.toLowerCase()}...`}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-900 placeholder:text-gray-400 max-h-24"
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
