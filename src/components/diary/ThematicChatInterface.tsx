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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Use IDENTICAL viewport hook as main Chat
  const viewport = useVisualViewport();
  
  const { sendMessage } = useThematicDiaries();
  const themeConfig = DIARY_THEMES.find(t => t.theme === theme)!;
  
  const messages = diary?.messages || [];
  
  // Scroll to bottom - IDENTICAL to main Chat
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
      });
    });
  }, []);

  // Scroll when messages change or keyboard opens
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, viewport.isKeyboardOpen, scrollToBottom]);

  // Auto-adjust textarea height - IDENTICAL to main Chat
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height (max 120px = ~5 lines)
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Prevent rubber-banding on header touch - IDENTICAL to main Chat
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const preventRubberBand = (e: TouchEvent) => {
      e.preventDefault();
    };

    header.addEventListener('touchmove', preventRubberBand, { passive: false });
    return () => {
      header.removeEventListener('touchmove', preventRubberBand);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    const messageText = input.trim();
    setInput('');
    setIsSending(true);
    
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Scroll immediately
    requestAnimationFrame(() => scrollToBottom('instant'));
    
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
    // On desktop: Enter sends, Shift+Enter for new line
    // On mobile: Enter creates new line (send button required)
    if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Container style - IDENTICAL to main Chat
  const containerStyle: React.CSSProperties = viewport.isKeyboardOpen 
    ? { 
        height: `${viewport.height}px`,
        position: 'fixed',
        top: `${viewport.offsetTop}px`,
        left: 0,
        right: 0,
        overflow: 'hidden',
      }
    : {};

  return (
    <div 
      className={cn(
        "flex flex-col bg-background",
        !viewport.isKeyboardOpen && "h-[100dvh]"
      )}
      style={containerStyle}
    >
      {/* Header - IDENTICAL structure to main Chat */}
      <header 
        ref={headerRef}
        className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 z-50 select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-3">
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
              <h1 className="font-display font-semibold text-foreground text-lg">
                Diario {themeConfig.label}
              </h1>
              <p className="text-xs text-muted-foreground">
                {messages.length} {messages.length === 1 ? 'messaggio' : 'messaggi'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages - IDENTICAL structure to main Chat */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-4 py-4 space-y-3"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <span className="text-5xl mb-4">{themeConfig.emoji}</span>
            <h2 className="font-display font-semibold text-foreground mb-2">
              Il tuo Diario {themeConfig.label}
            </h2>
            <p className="text-sm text-muted-foreground">
              Scrivi i tuoi pensieri, emozioni e riflessioni su questo tema. 
              L'AI ricorderà tutto per le prossime conversazioni.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                role={msg.role}
                timestamp={new Date(msg.timestamp)}
              />
            ))}
          </>
        )}
        
        {/* Typing indicator - IDENTICAL to main Chat */}
        {isSending && (
          <div className="flex gap-2 animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-white dark:bg-card rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-border/50">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-muted-foreground ml-1">Sta scrivendo...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area - IDENTICAL to main Chat */}
      <div 
        className="shrink-0 bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 pt-3 z-50"
        style={{
          paddingBottom: viewport.isKeyboardOpen 
            ? '12px' 
            : `calc(12px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <div className="flex items-end gap-3 bg-muted/80 rounded-2xl p-1.5 border border-border/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Scrivi nel tuo diario ${themeConfig.label.toLowerCase()}...`}
            disabled={isSending}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            rows={1}
            className="chat-input flex-1 bg-transparent px-4 py-2.5 placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 resize-none overflow-y-auto"
            style={{
              fontSize: '16px',
              lineHeight: '1.5',
              touchAction: 'manipulation',
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="shrink-0 rounded-xl h-10 w-10 shadow-sm mb-0.5"
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
