import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useObjectives, type CreateObjectiveInput } from '@/hooks/useObjectives';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface ObjectiveCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ObjectiveCreationModal: React.FC<ObjectiveCreationModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createObjective } = useObjectives();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hide/show bottom nav and reset when modal opens/closes
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Ciao! 🎯 Qual è il tuo prossimo obiettivo? Dimmi cosa vuoi raggiungere e ti aiuterò a definirlo nel dettaglio.',
      }]);
      setInputValue('');
      // Focus input after short delay
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
    }
  }, [open]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Build conversation history for API
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content: userMessage });

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('create-objective-chat', {
        body: { messages: chatHistory },
      });

      if (error) throw error;

      const { message: aiMessage, objective, createNow } = data;
      
      addMessage('assistant', aiMessage);

      // If ready to create the objective
      if (createNow && objective) {
        const objectivePayload: CreateObjectiveInput = {
          category: objective.category, // AI determines category automatically
          title: objective.title,
          description: objective.description,
          target_value: objective.target_value,
          starting_value: objective.starting_value,
          current_value: objective.current_value ?? objective.starting_value,
          unit: objective.unit,
          deadline: objective.deadline,
          input_method: objective.input_method || 'numeric',
          ai_custom_description: objective.ai_custom_description,
          ai_feedback: objective.ai_feedback,
        };

        await createObjective.mutateAsync(objectivePayload);
        
        toast({
          title: "Obiettivo creato! 🎉",
          description: objective.title,
        });
        
        setTimeout(() => onOpenChange(false), 1500);
      }

    } catch (error) {
      console.error('Error in objective creation chat:', error);
      addMessage('assistant', 'Ops, qualcosa è andato storto. Riprova a descrivere il tuo obiettivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl p-0 bg-background border-t border-glass-border [&>button]:hidden"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-left text-lg">Nuovo Obiettivo</SheetTitle>
              <p className="text-sm text-muted-foreground">Descrivi il tuo obiettivo ad Aria</p>
            </div>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 h-[calc(85vh-180px)]" ref={scrollRef}>
          <div className="p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-glass border border-glass-border rounded-bl-md"
                  )}>
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-glass border border-glass-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Aria sta pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area - Always visible */}
        <div className="p-4 border-t border-glass-border bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Es. Voglio perdere 5kg, risparmiare 1000€..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-glass border-glass-border"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ObjectiveCreationModal;
