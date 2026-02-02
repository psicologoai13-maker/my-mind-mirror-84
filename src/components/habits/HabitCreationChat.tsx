import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHabits, HabitCategory } from '@/hooks/useHabits';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedHabit {
  habit_type: string;
  label: string;
  icon: string;
  category: HabitCategory;
  daily_target?: number;
  unit?: string;
  streak_type: 'daily' | 'abstain';
  input_method: string;
  update_method: 'checkin' | 'chat' | 'auto_sync';
  requires_permission?: boolean;
}

interface HabitCreationChatProps {
  onHabitCreated: () => void;
  onCancel: () => void;
}

const HabitCreationChat: React.FC<HabitCreationChatProps> = ({
  onHabitCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { addHabit } = useHabits();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Ciao! 🌟 Che abitudine vorresti tracciare? Descrivi liberamente cosa hai in mente - posso aiutarti a configurarla perfettamente!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [habitCreated, setHabitCreated] = useState(false);
  const [createdHabitName, setCreatedHabitName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-habit-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if habit was extracted and should be created
      if (data.habit && data.createNow) {
        const habit = data.habit as ExtractedHabit;
        
        await addHabit.mutateAsync({
          habitType: habit.habit_type,
          daily_target: habit.daily_target,
          unit: habit.unit,
          streak_type: habit.streak_type,
          update_method: habit.update_method,
          requires_permission: habit.requires_permission || false,
        });

        setCreatedHabitName(`${habit.icon} ${habit.label}`);
        setHabitCreated(true);
      }
    } catch (error) {
      console.error('Error in habit chat:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Ops, c'è stato un problema. Riprova!"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-3 py-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {message.role === 'assistant' && (
                  <Sparkles className="w-3 h-3 inline-block mr-1.5 text-primary" />
                )}
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input or Success */}
      {habitCreated ? (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">{createdHabitName} aggiunta!</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setHabitCreated(false);
                setCreatedHabitName('');
                setMessages([{
                  id: 'new-initial',
                  role: 'assistant',
                  content: "Perfetto! Vuoi aggiungere un'altra abitudine? Raccontami!"
                }]);
              }}
            >
              Aggiungi altra
            </Button>
            <Button 
              className="flex-1"
              onClick={onHabitCreated}
            >
              Fatto
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Es: Voglio bere più acqua..."
              className="flex-1 text-foreground"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <button
            onClick={onCancel}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
};

export default HabitCreationChat;
