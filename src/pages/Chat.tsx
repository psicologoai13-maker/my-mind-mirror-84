import React, { useState, useRef, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Brain, Sparkles, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSessions } from '@/hooks/useSessions';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { startSession, endSession } = useSessions();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userName = profile?.name?.split(' ')[0] || 'Amico';
  const hasMemory = (profile?.long_term_memory?.length || 0) > 0;

  // Initialize chat with greeting
  useEffect(() => {
    const initChat = async () => {
      try {
        const session = await startSession.mutateAsync('chat');
        setSessionId(session.id);
      } catch (error) {
        console.error('Failed to start session:', error);
      }

      setMessages([{
        id: '1',
        content: `Ciao ${userName}! 💚 Come stai oggi? Sono qui per ascoltarti.`,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    };
    
    initChat();
  }, [userName]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

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
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

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

  return (
    <MobileLayout hideNav className="pb-0">
      {/* Header - Modern Minimal */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-foreground text-lg">Il tuo Spazio Sicuro</h1>
              {hasMemory && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Brain className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Memoria</span>
                </div>
              )}
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

      {/* Messages - Clean Bubbles */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex animate-slide-up',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] px-4 py-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-2xl rounded-tl-sm'
              )}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              <p
                className={cn(
                  'text-[10px] mt-1.5 opacity-60',
                  message.role === 'user' ? 'text-right' : 'text-left'
                )}
              >
                {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Floating Pill Style */}
      <div className="p-4 pb-6">
        <div className="flex items-center gap-2 bg-muted rounded-full p-1.5 shadow-soft">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Scrivi come ti senti..."
            disabled={isTyping}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="shrink-0 rounded-full h-10 w-10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Chat;