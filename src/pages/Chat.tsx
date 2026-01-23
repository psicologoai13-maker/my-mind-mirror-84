import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Brain, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSessions } from '@/hooks/useSessions';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CrisisModal from '@/components/safety/CrisisModal';
import ChatBubble from '@/components/chat/ChatBubble';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { user, session } = useAuth();
  const { startSession, endSession } = useSessions();
  const queryClient = useQueryClient();
  const { height: viewportHeight, isKeyboardOpen } = useVisualViewport();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time message persistence
  const { messages, addMessage, isLoading: isLoadingMessages } = useChatMessages(sessionId);
  
  const userName = profile?.name?.split(' ')[0] || 'Amico';
  const memoryFacts = profile?.long_term_memory || [];
  const hasMemory = memoryFacts.length > 0;
  const memoryPreview = hasMemory 
    ? memoryFacts.slice(0, 3).join(' • ').substring(0, 100) + '...'
    : 'Nessun ricordo ancora';

  // Finalize session with AI analysis
  const finalizeSession = useCallback(async (showToast = true) => {
    if (!sessionId || messages.length < 2 || isClosingSession) return;
    
    setIsClosingSession(true);
    
    try {
      const transcript = messages.map(m => 
        `${m.role === 'user' ? 'Tu' : 'AI'}: ${m.content}`
      ).join('\n\n');
      
      // Get AI summary
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      let summary = {
        summary: 'Sessione completata',
        mood_score: 5,
        anxiety_score: 5,
        tags: ['Generale'],
      };

      try {
        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: apiMessages, generateSummary: true }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.summary) {
            summary = data.summary;
          }
        }
      } catch (err) {
        console.error('Summary generation failed:', err);
      }

      await endSession.mutateAsync({
        sessionId,
        transcript,
        ai_summary: summary.summary,
        mood_score_detected: summary.mood_score,
        anxiety_score_detected: summary.anxiety_score,
        emotion_tags: summary.tags,
      });

      // Process session for memory extraction
      if (user?.id) {
        try {
          await supabase.functions.invoke('process-session', {
            body: {
              session_id: sessionId,
              user_id: user.id,
              transcript,
            }
          });
          queryClient.invalidateQueries({ queryKey: ['daily-metrics', user.id] });
          queryClient.invalidateQueries({ queryKey: ['sessions', user.id] });
        } catch (processError) {
          console.error('Session processing failed:', processError);
        }
      }

      if (showToast) {
        toast.success('Sessione salvata nel diario! 📔');
      }
    } catch (error) {
      console.error('Error finalizing session:', error);
      if (showToast) {
        toast.error('Errore nel salvare la sessione');
      }
    } finally {
      setIsClosingSession(false);
    }
  }, [sessionId, messages, session?.access_token, endSession, user?.id, queryClient, isClosingSession]);

  // Idle timer - auto-close after 5 minutes
  const handleIdle = useCallback(async () => {
    if (messages.length >= 2) {
      toast.info('Sessione chiusa per inattività', { duration: 4000 });
      await finalizeSession(false);
      navigate('/');
    }
  }, [messages.length, finalizeSession, navigate]);

  useIdleTimer({
    timeout: IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
    enabled: isSessionReady && messages.length >= 2,
  });

  // Initialize session
  useEffect(() => {
    if (isProfileLoading || isSessionReady) return;
    
    const initChat = async () => {
      try {
        const newSession = await startSession.mutateAsync('chat');
        setSessionId(newSession.id);
        
        // Add initial greeting as system message
        const greeting = profile?.name 
          ? `Ciao ${profile.name.split(' ')[0]}! 💚 Come stai oggi? Sono qui per ascoltarti.`
          : `Ciao! 💚 Come stai oggi? Sono qui per ascoltarti.`;
        
        // Wait for session ID to be set, then add greeting
        setTimeout(async () => {
          if (newSession.id) {
            const { error } = await supabase
              .from('chat_messages')
              .insert({
                session_id: newSession.id,
                user_id: user?.id,
                role: 'assistant',
                content: greeting,
              });
            if (!error) {
              // Force reload messages
              queryClient.invalidateQueries({ queryKey: ['chat-messages', newSession.id] });
            }
          }
        }, 100);
        
        setIsSessionReady(true);
      } catch (error) {
        console.error('Failed to start session:', error);
        toast.error('Errore nell\'avvio della chat');
      }
    };
    
    initChat();
  }, [isProfileLoading, isSessionReady, profile?.name, startSession, user?.id, queryClient]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Force scroll when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isKeyboardOpen, scrollToBottom]);

  // Handle message send
  const handleSend = async () => {
    if (!input.trim() || isTyping || !isSessionReady || !sessionId) return;

    const userInput = input;
    setInput('');
    setIsTyping(true);

    // Persist user message immediately
    await addMessage('user', userInput);

    // Get all messages for context
    const apiMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userInput },
    ];

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      // Crisis detection
      const crisisAlert = response.headers.get('X-Crisis-Alert');
      if (crisisAlert === 'true') {
        setShowCrisisModal(true);
      }

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error('Troppe richieste. Riprova tra qualche secondo.');
        } else if (response.status === 402) {
          toast.error('Crediti AI esauriti.');
        } else {
          toast.error(errorData.error || 'Errore nella risposta');
        }
        setIsTyping(false);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Create temporary streaming message ID
      const tempId = `streaming-${Date.now()}`;
      setStreamingMessageId(tempId);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setStreamingContent(assistantContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Process remaining buffer
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setStreamingContent(assistantContent);
            }
          } catch { /* ignore */ }
        }
      }

      // Persist complete AI response
      if (assistantContent) {
        await addMessage('assistant', assistantContent);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsTyping(false);
      setStreamingMessageId(null);
      setStreamingContent('');
    }
  };

  // Handle back navigation with session finalization
  const handleBack = async () => {
    if (messages.length >= 2 && !isClosingSession) {
      await finalizeSession(true);
    }
    navigate('/');
  };

  // Loading state
  if (isProfileLoading || !isSessionReady) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Brain className="w-12 h-12 text-primary animate-pulse" />
            <Loader2 className="w-6 h-6 text-primary/60 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">Preparando la chat...</p>
            <p className="text-muted-foreground text-sm mt-1">Sto caricando il tuo profilo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 flex flex-col bg-background overflow-hidden"
      style={{ 
        height: isKeyboardOpen && viewportHeight ? `${viewportHeight}px` : '100dvh',
        transition: 'height 0.1s ease-out',
      }}
    >
      {/* Crisis Emergency Modal */}
      <CrisisModal 
        isOpen={showCrisisModal} 
        onClose={() => setShowCrisisModal(false)} 
      />
      
      {/* Header - Compact */}
      <header className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack} 
              disabled={isClosingSession}
              className="shrink-0"
            >
              {isClosingSession ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowLeft className="w-5 h-5" />
              )}
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-foreground text-lg">Il tuo Spazio Sicuro</h1>
              
              {/* Memory Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full cursor-help transition-colors",
                      hasMemory 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      <Brain className="w-3 h-3" />
                      <span className="text-[10px] font-medium">
                        {hasMemory ? `${memoryFacts.length} ricordi` : 'Nuova'}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs font-medium mb-1">Memoria Centrale</p>
                    <p className="text-xs text-muted-foreground">{memoryPreview}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Auto-save indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-salvato</span>
          </div>
        </div>
      </header>

      {/* Messages - Flexible scroll area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                content={message.content}
                role={message.role}
                timestamp={message.created_at}
              />
            ))}
            
            {/* Streaming message */}
            {streamingMessageId && streamingContent && (
              <ChatBubble
                key={streamingMessageId}
                content={streamingContent}
                role="assistant"
                timestamp={new Date()}
              />
            )}
            
            {/* Typing indicator */}
            {isTyping && !streamingContent && (
              <div className="flex gap-2 animate-fade-in">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white dark:bg-card rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-border/50">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom, moves with keyboard */}
      <div 
        className="shrink-0 bg-background/95 backdrop-blur-lg border-t border-border/50 px-4"
        style={{
          paddingTop: '0.75rem',
          paddingBottom: isKeyboardOpen 
            ? '0.5rem' 
            : 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center gap-3 bg-muted/80 rounded-2xl p-1.5 border border-border/30">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Scrivi come ti senti..."
            className="flex-1 bg-transparent border-none outline-none text-base px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            disabled={isTyping}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            enterKeyHint="send"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground w-10 h-10"
          >
            {isTyping ? (
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

export default Chat;
