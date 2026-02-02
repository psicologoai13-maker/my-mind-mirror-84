import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useObjectives } from '@/hooks/useObjectives';
import { cn } from '@/lib/utils';
import type { ObjectiveCategory } from '@/lib/objectiveTypes';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedObjective {
  category: ObjectiveCategory;
  title: string;
  description?: string;
  target_value?: number;
  starting_value?: number;
  current_value?: number;
  unit?: string;
  input_method?: 'numeric' | 'milestone';
  deadline?: string;
  objective_type?: 'counter' | 'transformation' | 'milestone';
}

interface ObjectiveCreationChatProps {
  onObjectiveCreated: () => void;
  onCancel: () => void;
}

const ObjectiveCreationChat: React.FC<ObjectiveCreationChatProps> = ({
  onObjectiveCreated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { createObjective } = useObjectives();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Ciao! 🎯 Raccontami che obiettivo vorresti raggiungere. Descrivi liberamente cosa hai in mente, poi ti faccio qualche domanda per capire meglio!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [objectiveCreated, setObjectiveCreated] = useState(false);
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-objective-chat`,
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

      // Check if objective was extracted and should be created
      if (data.objective && data.createNow) {
        const objective = data.objective as ExtractedObjective;
        
        await createObjective.mutateAsync({
          category: objective.category,
          title: objective.title,
          description: objective.description,
          target_value: objective.target_value,
          starting_value: objective.objective_type === 'counter' ? 0 : objective.starting_value,
          current_value: objective.current_value ?? (objective.objective_type === 'counter' ? 0 : objective.starting_value) ?? 0,
          unit: objective.unit,
          input_method: objective.input_method || 'numeric',
          deadline: objective.deadline,
        });

        setObjectiveCreated(true);
      }
    } catch (error) {
      console.error('Error in objective chat:', error);
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
      {objectiveCreated ? (
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            <span className="font-medium">Obiettivo aggiunto!</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setObjectiveCreated(false);
                setMessages([{
                  id: 'new-initial',
                  role: 'assistant',
                  content: "Perfetto! Vuoi aggiungere un altro obiettivo? Raccontami!"
                }]);
              }}
            >
              Aggiungi altro
            </Button>
            <Button 
              className="flex-1"
              onClick={onObjectiveCreated}
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
              placeholder="Scrivi il tuo obiettivo..."
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

export default ObjectiveCreationChat;
