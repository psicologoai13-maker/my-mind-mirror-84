import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Activity, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface HabitCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HabitCreationModal: React.FC<HabitCreationModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addHabit } = useHabits();
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
        content: 'Ciao! 🌟 Sono qui per aiutarti a creare una nuova abitudine. Cosa vorresti tracciare? (es. "bere più acqua", "fare yoga", "smettere di fumare")',
      }]);
      setInputValue('');
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
      const { data, error } = await supabase.functions.invoke('create-habit-chat', {
        body: { messages: chatHistory },
      });

      if (error) throw error;

      const { message: aiMessage, habit, createNow } = data;
      
      addMessage('assistant', aiMessage);

      // If ready to create the habit
      if (createNow && habit) {
        await addHabit.mutateAsync({
          habitType: habit.habit_type,
          daily_target: habit.daily_target,
          unit: habit.unit || '',
          streak_type: habit.streak_type || 'daily',
          update_method: habit.update_method || 'checkin',
        });
        
        toast({
          title: "Abitudine creata! 🎉",
          description: habit.label,
        });
        
        setTimeout(() => onOpenChange(false), 1500);
      }

    } catch (error) {
      console.error('Error in habit creation chat:', error);
      addMessage('assistant', 'Ops, qualcosa è andato storto. Riprova a descrivere la tua abitudine.');
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
        className="h-[85vh] rounded-t-3xl p-0 bg-background border-t border-glass-border"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">Nuova Abitudine</SheetTitle>
                <p className="text-sm text-muted-foreground">Aria ti guiderà nella creazione</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 h-[calc(85vh-160px)]" ref={scrollRef}>
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

        {/* Input Area */}
        <div className="p-4 border-t border-glass-border bg-background">
          <div className="flex items-end gap-2">
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descrivi la tua abitudine..."
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

export default HabitCreationModal;
