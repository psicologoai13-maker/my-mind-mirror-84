import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DiaryTheme, ThematicDiary, DIARY_THEMES, useThematicDiaries } from '@/hooks/useThematicDiaries';
import { useVisualViewport } from '@/hooks/useVisualViewport';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { height: viewportHeight, isKeyboardOpen } = useVisualViewport();
  
  const { sendMessage } = useThematicDiaries();
  const themeConfig = DIARY_THEMES.find(t => t.theme === theme)!;
  
  const messages = diary?.messages || [];
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-adjust textarea height
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 5 lines (~120px)
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Reset textarea height after sending
  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Prevent rubber-banding on header
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const preventTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    header.addEventListener('touchmove', preventTouchMove, { passive: false });
    return () => {
      header.removeEventListener('touchmove', preventTouchMove);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    const messageText = input.trim();
    setInput('');
    setIsSending(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      await sendMessage.mutateAsync({ theme, message: messageText });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sends, Shift+Enter for new line
    // Mobile: Enter creates new line (send button is used)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
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

  // Dynamic container style based on viewport
  const containerStyle: React.CSSProperties = isKeyboardOpen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: `${viewportHeight}px`,
        display: 'flex',
        flexDirection: 'column',
      }
    : {
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      };

  return (
    <div 
      ref={containerRef}
      className="bg-gray-50 overscroll-contain"
      style={containerStyle}
    >
      {/* Header */}
      <header 
        ref={headerRef}
        className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white/80 backdrop-blur-xl z-50"
      >
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
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

      {/* Input - Smart Auto-Growing Textarea */}
      <div 
        className="shrink-0 bg-white/95 backdrop-blur-lg border-t border-gray-100"
        style={{
          paddingBottom: isKeyboardOpen ? '0.5rem' : 'calc(0.75rem + env(safe-area-inset-bottom))',
          paddingTop: '0.75rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <div className="flex items-end gap-3 bg-gray-100/80 border border-gray-200/50 rounded-2xl px-4 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Scrivi nel tuo diario ${themeConfig.label.toLowerCase()}...`}
            rows={1}
            className="chat-input flex-1 bg-transparent border-none outline-none resize-none text-gray-900 placeholder:text-gray-400 max-h-[120px] overflow-y-auto focus:outline-none focus:ring-0"
            style={{
              fontSize: '16px',
              lineHeight: '1.5',
              minHeight: '24px',
            }}
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={cn(
              "shrink-0 rounded-xl w-10 h-10 shadow-sm",
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
