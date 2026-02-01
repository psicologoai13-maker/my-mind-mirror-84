import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Brain, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSessions } from '@/hooks/useSessions';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useRealTimeContext } from '@/hooks/useRealTimeContext';
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
  const { context: realTimeContext } = useRealTimeContext();
  
  // VisualViewport for iOS keyboard handling
  const viewport = useVisualViewport();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [initialGreeting, setInitialGreeting] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // CRITICAL: Prevent multiple init calls
  const initCalledRef = useRef(false);

  // Real-time message persistence with optimistic updates
  const { messages, addMessage, addOptimisticMessage, confirmMessage, removeOptimisticMessage, isLoading: isLoadingMessages } = useChatMessages(sessionId);
  
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

  // Initialize session - ULTRA FAST: use ref to prevent double init, show greeting immediately
  useEffect(() => {
    // CRITICAL: Only run once per mount - check ref FIRST
    if (initCalledRef.current) return;
    if (!user?.id) return;
    
    // Mark as called IMMEDIATELY before any async work
    initCalledRef.current = true;
    
    const initChat = async () => {
      try {
        const cachedName = profile?.name?.split(' ')[0];
        
        // Query recent sessions to determine appropriate greeting
        const { data: recentSessions } = await supabase
          .from('sessions')
          .select('start_time, ai_summary')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('start_time', { ascending: false })
          .limit(1);
        
        // Generate context-aware greeting based on recency
        let greeting: string;
        
        if (recentSessions && recentSessions.length > 0) {
          const lastSession = recentSessions[0];
          const lastTime = new Date(lastSession.start_time);
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - lastTime.getTime()) / (1000 * 60));
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          if (diffMinutes < 30) {
            // Just talked!
            greeting = cachedName 
              ? `Ehi ${cachedName}! Ci siamo appena sentiti 😊 Tutto ok?`
              : `Ehi! Ci siamo appena sentiti 😊 Tutto ok?`;
          } else if (diffMinutes < 60) {
            greeting = cachedName 
              ? `Ciao ${cachedName}! Bentornato/a! 💚 È successo qualcosa?`
              : `Ciao! Bentornato/a! 💚 È successo qualcosa?`;
          } else if (diffHours < 3) {
            greeting = cachedName 
              ? `Ciao di nuovo ${cachedName}! 💚 Com'è andata nel frattempo?`
              : `Ciao di nuovo! 💚 Com'è andata nel frattempo?`;
          } else if (diffHours < 24) {
            greeting = cachedName 
              ? `Ehi ${cachedName}! 💚 Come stai ora?`
              : `Ehi! 💚 Come stai ora?`;
          } else if (diffDays === 1) {
            greeting = cachedName 
              ? `Ciao ${cachedName}! 💚 Come stai oggi?`
              : `Ciao! 💚 Come stai oggi?`;
          } else if (diffDays < 7) {
            greeting = cachedName 
              ? `Ehi ${cachedName}! 💚 È un po' che non ci sentiamo, come va?`
              : `Ehi! 💚 È un po' che non ci sentiamo, come va?`;
          } else {
            greeting = cachedName 
              ? `${cachedName}! 💚 Che bello risentirti! Come stai?`
              : `Che bello risentirti! 💚 Come stai?`;
          }
        } else {
          // First conversation ever
          greeting = cachedName 
            ? `Ciao ${cachedName}! 💚 Sono Aria, piacere di conoscerti! Raccontami un po' di te...`
            : `Ciao! 💚 Sono Aria, piacere di conoscerti! Raccontami un po' di te...`;
        }
        
        // Show greeting IMMEDIATELY in UI (optimistic)
        setInitialGreeting(greeting);
        setIsSessionReady(true);
        
        // Create session - this MUST succeed for chat to work
        const newSession = await startSession.mutateAsync('chat');
        
        // Set sessionId IMMEDIATELY so messages can be sent
        setSessionId(newSession.id);
        
        // Persist greeting to DB in background (non-blocking)
        supabase
          .from('chat_messages')
          .insert({
            session_id: newSession.id,
            user_id: user.id,
            role: 'assistant',
            content: greeting,
          });
          
      } catch (error) {
        console.error('Failed to start session:', error);
        toast.error('Errore nell\'avvio della chat');
      }
    };
    
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Scroll to bottom - optimized for mobile
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
      });
    });
  }, []);

  // Scroll when messages change, streaming updates, or keyboard opens
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingContent, viewport.isKeyboardOpen, scrollToBottom]);

  // Prevent rubber-banding on header touch
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

  // Handle message send with optimistic UI
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height (max 120px = ~5 lines)
    const newHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Handle input change with auto-resize
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (!input) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !isSessionReady || !sessionId) return;

    const userInput = input.trim();
    setInput('');
    
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // OPTIMISTIC: Show user message immediately (no DB wait)
    const userTempId = addOptimisticMessage('user', userInput);
    
    // Start typing indicator immediately
    setIsTyping(true);
    
    // Scroll to show the new message + typing indicator
    requestAnimationFrame(() => scrollToBottom('instant'));

    // Get all messages for context (include the optimistic one)
    // CRITICAL: Include the initial greeting if it exists but wasn't yet in messages array
    const existingMessages = messages.map(m => ({ role: m.role, content: m.content }));
    
    // Check if initial greeting exists but isn't in messages yet (first user message scenario)
    const hasGreetingInMessages = messages.some(m => m.role === 'assistant');
    if (initialGreeting && !hasGreetingInMessages) {
      existingMessages.unshift({ role: 'assistant' as const, content: initialGreeting });
    }
    
    const apiMessages = [
      ...existingMessages,
      { role: 'user' as const, content: userInput },
    ];

    let assistantContent = '';

    // Persist user message in background (don't block UI)
    addMessage('user', userInput).then((savedMsg) => {
      if (savedMsg) {
        confirmMessage(userTempId, savedMsg);
      }
    }).catch(() => {
      // On error, remove the optimistic message
      removeOptimisticMessage(userTempId);
      toast.error('Errore nell\'invio del messaggio');
    });

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: apiMessages,
          realTimeContext, // Include real-time context
        }),
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

  // Handle back navigation - IMMEDIATE exit, save in background
  const handleBack = () => {
    // Navigate IMMEDIATELY - don't block user
    navigate('/');
    
    // Finalize session in background (fire and forget)
    if (messages.length >= 1 && !isClosingSession) {
      // Use setTimeout to ensure navigation happens first
      setTimeout(() => {
        finalizeSession(true).catch(err => {
          console.error('Background session save failed:', err);
        });
      }, 0);
    }
  };

  // Loading state - only show briefly while session is being created
  if (!isSessionReady) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Brain className="w-12 h-12 text-primary animate-pulse" />
            <Loader2 className="w-6 h-6 text-primary/60 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">Avvio chat...</p>
          </div>
        </div>
      </div>
    );
  }

  // Container style for iOS keyboard handling
  // CRITICAL: Always provide stable dimensions to prevent flicker
  const containerStyle: React.CSSProperties = {
    // Always use fixed background to prevent transparency flash
    backgroundColor: 'hsl(var(--background))',
    // Prevent iOS rubber-banding
    overscrollBehavior: 'none',
    // Hardware acceleration for smoother transitions
    transform: 'translateZ(0)',
    WebkitTransform: 'translateZ(0)',
    ...(viewport.isKeyboardOpen ? { 
      height: `${viewport.height}px`,
      position: 'fixed' as const,
      top: `${viewport.offsetTop}px`,
      left: 0,
      right: 0,
      overflow: 'hidden',
    } : {
      minHeight: '100dvh',
    }),
  };

  return (
    <div 
      className={cn(
        "flex flex-col bg-background chat-container-stable",
        !viewport.isKeyboardOpen && "h-[100dvh]"
      )}
      style={containerStyle}
    >
      {/* Crisis Emergency Modal */}
      <CrisisModal 
        isOpen={showCrisisModal} 
        onClose={() => setShowCrisisModal(false)} 
      />
      
      {/* Header - Compact & fixed */}
      <header 
        ref={headerRef}
        className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 z-50 select-none"
        style={{ touchAction: 'none' }}
      >
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

      {/* Messages - Flex grow with overflow scroll */}
      {/* GOLDEN RULE: If messages.length > 0, NEVER show loading spinner - always keep messages visible */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-4 py-4 space-y-3 bg-background"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          // CRITICAL: Fixed background to prevent transparency during resize
          backgroundColor: 'hsl(var(--background))',
        }}
      >
        {/* Show skeleton ONLY if loading AND no messages yet AND no initial greeting (first load) */}
        {isLoadingMessages && messages.length === 0 && !initialGreeting ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn(
                "flex gap-2 animate-pulse",
                i % 2 === 0 ? "justify-end" : ""
              )}>
                {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-muted" />}
                <div className={cn(
                  "rounded-2xl px-4 py-3",
                  i % 2 === 0 ? "bg-primary/20 w-2/3" : "bg-muted w-3/4"
                )}>
                  <div className="h-4 bg-muted-foreground/10 rounded w-full mb-2" />
                  <div className="h-4 bg-muted-foreground/10 rounded w-2/3" />
                </div>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-muted" />}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* INSTANT: Show optimistic greeting ONLY if no assistant messages loaded yet */}
            {/* This prevents flicker when messages load from DB */}
            {initialGreeting && !messages.some(m => m.role === 'assistant') && (
              <ChatBubble
                key="initial-greeting"
                content={initialGreeting}
                role="assistant"
                timestamp={new Date()}
              />
            )}
            
            {/* Real messages from DB */}
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
            
            {/* Typing indicator - shows immediately when waiting for AI */}
            {isTyping && !streamingContent && (
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
          </>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area - Fixed at bottom, respects keyboard */}
      <div 
        ref={inputContainerRef}
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
            onKeyDown={(e) => {
              // On desktop: Enter sends, Shift+Enter for new line
              // On mobile: Enter creates new line (send button required)
              if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Scrivi come ti senti..."
            disabled={isTyping || !isSessionReady}
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            rows={1}
            className="chat-input flex-1 bg-transparent text-foreground px-4 py-2.5 placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 resize-none overflow-y-auto"
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
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-xl h-10 w-10 shadow-sm mb-0.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
