import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, Target, Heart, Briefcase, GraduationCap, Wallet, Dumbbell, Brain, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useObjectives, type ObjectiveCategory, type CreateObjectiveInput } from '@/hooks/useObjectives';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface ObjectiveCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS = [
  { id: 'body' as ObjectiveCategory, label: 'Corpo & Salute', icon: Dumbbell, emoji: '💪', color: 'text-emerald-500' },
  { id: 'finance' as ObjectiveCategory, label: 'Finanze', icon: Wallet, emoji: '💰', color: 'text-amber-500' },
  { id: 'study' as ObjectiveCategory, label: 'Studio', icon: GraduationCap, emoji: '📚', color: 'text-blue-500' },
  { id: 'work' as ObjectiveCategory, label: 'Lavoro', icon: Briefcase, emoji: '💼', color: 'text-purple-500' },
  { id: 'relationships' as ObjectiveCategory, label: 'Relazioni', icon: Heart, emoji: '❤️', color: 'text-pink-500' },
  { id: 'growth' as ObjectiveCategory, label: 'Crescita', icon: Brain, emoji: '🧠', color: 'text-indigo-500' },
];

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
  const [step, setStep] = useState<'category' | 'chat'>('category');
  const [selectedCategory, setSelectedCategory] = useState<ObjectiveCategory | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Ciao! 🎯 Sono qui per aiutarti a definire un nuovo obiettivo. In quale area vuoi migliorare?',
      }]);
      setStep('category');
      setSelectedCategory(null);
      setInputValue('');
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

  const handleCategorySelect = (category: ObjectiveCategory) => {
    setSelectedCategory(category);
    const categoryInfo = CATEGORY_OPTIONS.find(c => c.id === category);
    addMessage('user', categoryInfo?.label || category);
    
    setTimeout(() => {
      addMessage('assistant', `Ottimo! ${categoryInfo?.emoji} Raccontami qual è il tuo obiettivo. Sii specifico se hai un numero in mente (es. "perdere 5kg", "risparmiare 1000€")`);
      setStep('chat');
      setTimeout(() => inputRef.current?.focus(), 100);
    }, 300);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !selectedCategory) return;

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
          category: objective.category || selectedCategory,
          title: objective.title,
          description: objective.description,
          target_value: objective.target_value,
          starting_value: objective.starting_value,
          current_value: objective.current_value ?? objective.starting_value,
          unit: objective.unit,
          deadline: objective.deadline,
          input_method: objective.input_method || 'numeric',
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
        className="h-[85vh] rounded-t-3xl p-0 bg-background border-t border-glass-border"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-glass-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">Nuovo Obiettivo</SheetTitle>
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
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              step === 'category' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
            )}>
              <Check className={cn("w-3 h-3", step === 'category' && "hidden")} />
              1. Categoria
            </div>
            <div className="w-4 h-0.5 rounded-full bg-muted" />
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              step === 'chat' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              2. Dettagli
            </div>
          </div>
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 h-[calc(85vh-200px)]" ref={scrollRef}>
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

            {/* Category Selection Grid */}
            {step === 'category' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 mt-4"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      "bg-glass hover:bg-card/80 hover:border-primary/50",
                      "border-glass-border active:scale-95"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-card to-muted">
                      {category.emoji}
                    </div>
                    <span className="text-sm font-medium text-foreground">{category.label}</span>
                  </button>
                ))}
              </motion.div>
            )}

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
        {step === 'chat' && (
          <div className="p-4 border-t border-glass-border bg-background">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descrivi il tuo obiettivo..."
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
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ObjectiveCreationModal;
