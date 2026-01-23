import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Brain, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSessions } from '@/hooks/useSessions';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useVisualViewport } from '@/hooks/useVisualViewport';
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

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { user, session } = useAuth();
  const { startSession, endSession } = useSessions();
  const queryClient = useQueryClient();
  const { isKeyboardOpen, keyboardHeight } = useVisualViewport();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isMemoryLoaded, setIsMemoryLoaded] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = profile?.name?.split(' ')[0] || 'Amico';
  const memoryFacts = profile?.long_term_memory || [];
  const hasMemory = memoryFacts.length > 0;
  const memoryPreview = hasMemory 
    ? memoryFacts.slice(0, 3).join(' • ').substring(0, 100) + '...'
    : 'Nessun ricordo ancora';

  // PHASE 1: Wait for profile to load before initializing chat
  useEffect(() => {
    if (isProfileLoading) return;
    
    // Profile is loaded - now we can init the chat
    const initChat = async () => {
      try {
        const newSession = await startSession.mutateAsync('chat');
        setSessionId(newSession.id);
      } catch (error) {
        console.error('Failed to start session:', error);
      }

      // Mark memory as loaded
      setIsMemoryLoaded(true);
      
      // Create personalized greeting using loaded profile
      const greeting = profile?.name 
        ? `Ciao ${profile.name.split(' ')[0]}! 💚 Come stai oggi? Sono qui per ascoltarti.`
        : `Ciao! 💚 Come stai oggi? Sono qui per ascoltarti.`;

      setMessages([{
        id: '1',
        content: greeting,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    };
    
    initChat();
  }, [isProfileLoading, profile?.name]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !isMemoryLoaded) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    let assistantContent = '';

    try {
      // CRITICAL: Use the actual user session token for auth
      const accessToken = session?.access_token;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      // Check for crisis alert header
      const crisisAlert = response.headers.get('X-Crisis-Alert');
      if (crisisAlert === 'true') {
        console.log('[Chat] Crisis alert detected - showing emergency modal');
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

      const assistantMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
      }]);

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
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveToJournal = async () => {
    if (!sessionId || messages.length < 2) {
      toast.info('Conversa ancora un po\' prima di salvare.');
      return;
    }

    setIsSavingMemory(true);
    
    try {
      const apiMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, generateSummary: true }),
      });

      let summary = {
        summary: 'Sessione completata',
        mood_score: 5,
        anxiety_score: 5,
        tags: ['Generale'],
      };

      if (response.ok) {
        const data = await response.json();
        if (data.summary) {
          summary = data.summary;
        }
      }

      const transcript = messages.map(m => `${m.role === 'user' ? 'Tu' : 'AI'}: ${m.content}`).join('\n\n');
      
      await endSession.mutateAsync({
        sessionId,
        transcript,
        ai_summary: summary.summary,
        mood_score_detected: summary.mood_score,
        anxiety_score_detected: summary.anxiety_score,
        emotion_tags: summary.tags,
      });

      if (user?.id) {
        try {
          const { error } = await supabase.functions.invoke('process-session', {
            body: {
              session_id: sessionId,
              user_id: user.id,
              transcript: transcript,
            }
          });
          
          if (!error) {
            // Invalidate metrics cache for instant sync with Dashboard/Analisi
            queryClient.invalidateQueries({ queryKey: ['daily-metrics', user.id] });
            queryClient.invalidateQueries({ queryKey: ['sessions', user.id] });
            toast.success('Salvato nel diario! La memoria è stata aggiornata 🧠');
          } else {
            toast.success('Salvato nel diario!');
          }
        } catch (processError) {
          console.error('Failed to process session:', processError);
          toast.success('Salvato nel diario!');
        }
      } else {
        toast.success('Salvato nel diario!');
      }

      // Start a new session for continued chatting
      const newSession = await startSession.mutateAsync('chat');
      setSessionId(newSession.id);

    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Errore nel salvare');
    } finally {
      setIsSavingMemory(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  // LOADING STATE - Block UI until memory is loaded
  if (isProfileLoading || !isMemoryLoaded) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Brain className="w-12 h-12 text-primary animate-pulse" />
            <Loader2 className="w-6 h-6 text-primary/60 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">Sincronizzazione Memoria...</p>
            <p className="text-muted-foreground text-sm mt-1">Sto caricando il tuo profilo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Crisis Emergency Modal */}
      <CrisisModal 
        isOpen={showCrisisModal} 
        onClose={() => setShowCrisisModal(false)} 
      />
      
      {/* Header - Modern Minimal */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-foreground text-lg">Il tuo Spazio Sicuro</h1>
              
              {/* Memory Debug Badge with Tooltip */}
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
          
          {/* Save to Journal Button */}
          <Button 
            variant="outline"
            size="sm"
            onClick={handleSaveToJournal}
            disabled={isSavingMemory || messages.length < 2}
            className="gap-1.5 text-xs"
          >
            {isSavingMemory ? (
              <Sparkles className="w-4 h-4 animate-spin" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
            Salva
          </Button>
        </div>
      </header>

      {/* Messages - Clean Bubbles with Markdown */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            content={message.content}
            role={message.role}
            timestamp={message.timestamp}
          />
        ))}
        
        {isTyping && (
          <div className="flex gap-2 animate-fade-in">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Dynamic positioning with visual viewport */}
      <div 
        className="sticky z-50 bg-background/95 backdrop-blur-lg border-t border-border/50"
        style={{
          bottom: isKeyboardOpen ? 0 : 0,
          paddingBottom: isKeyboardOpen ? '0.5rem' : 'calc(0.75rem + env(safe-area-inset-bottom))',
          paddingTop: '0.75rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
        }}
      >
        <div className="flex items-center gap-3 bg-muted/80 rounded-2xl p-1.5 border border-border/30">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Scrivi come ti senti..."
            disabled={isTyping || !isMemoryLoaded}
            className="flex-1 bg-transparent px-4 py-2.5 text-[16px] placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-xl h-10 w-10 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;