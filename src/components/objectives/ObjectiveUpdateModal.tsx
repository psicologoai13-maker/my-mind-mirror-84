import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, TrendingUp, Loader2, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useObjectives, type Objective, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

interface ObjectiveUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ObjectiveUpdateModal: React.FC<ObjectiveUpdateModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeObjectives } = useObjectives();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Generate initial message based on active objectives
  const getInitialMessage = () => {
    if (activeObjectives.length === 0) {
      return "Non hai ancora obiettivi attivi. Vuoi crearne uno nuovo?";
    }
    
    const objectivesList = activeObjectives
      .map((obj, i) => `${i + 1}. **${obj.title}** (${CATEGORY_CONFIG[obj.category].label})`)
      .join('\n');
    
    return `Ciao! 📊 Vedo che hai ${activeObjectives.length} obiettiv${activeObjectives.length === 1 ? 'o' : 'i'} attiv${activeObjectives.length === 1 ? 'o' : 'i'}:\n\n${objectivesList}\n\nRaccontami i tuoi progressi! Ad esempio:\n- "Ho perso 2kg questa settimana"\n- "Ho risparmiato 150€ questo mese"\n- "Oggi ho studiato 3 ore"`;
  };

  // Track if modal was just opened
  const wasOpenRef = useRef(false);

  // Hide/show bottom nav and reset when modal opens/closes
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Only reset on first open
      window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
      setMessages([{
        id: '1',
        role: 'assistant',
        content: getInitialMessage(),
      }]);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 300);
      wasOpenRef.current = true;
    } else if (!open) {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
      wasOpenRef.current = false;
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

      // Call the edge function for objective updates
      const { data, error } = await supabase.functions.invoke('update-objective-chat', {
        body: { 
          messages: chatHistory,
          activeObjectives: activeObjectives.map(obj => ({
            id: obj.id,
            title: obj.title,
            category: obj.category,
            current_value: obj.current_value,
            target_value: obj.target_value,
            starting_value: obj.starting_value,
            unit: obj.unit,
            ai_progress_estimate: obj.ai_progress_estimate,
            ai_milestones: obj.ai_milestones,
          })),
        },
      });

      if (error) throw error;

      const { message: aiMessage, updates } = data;
      
      addMessage('assistant', aiMessage);

      // If there are updates, refresh the objectives
      if (updates && updates.length > 0) {
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ['objectives'] });
        
        toast({
          title: "Progressi aggiornati! 🎉",
          description: `${updates.length} obiettiv${updates.length === 1 ? 'o' : 'i'} aggiornat${updates.length === 1 ? 'o' : 'i'}`,
        });
      }

    } catch (error) {
      console.error('Error in objective update chat:', error);
      addMessage('assistant', 'Ops, qualcosa è andato storto. Riprova a raccontarmi i tuoi progressi.');
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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">Aggiorna Progressi</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {activeObjectives.length} obiettiv{activeObjectives.length === 1 ? 'o' : 'i'} attiv{activeObjectives.length === 1 ? 'o' : 'i'}
                </p>
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
          
          {/* Active objectives pills */}
          {activeObjectives.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {activeObjectives.slice(0, 4).map(obj => (
                <div 
                  key={obj.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-glass border border-glass-border text-xs"
                >
                  <span>{CATEGORY_CONFIG[obj.category].emoji}</span>
                  <span className="text-foreground font-medium truncate max-w-[120px]">
                    {obj.title}
                  </span>
                </div>
              ))}
              {activeObjectives.length > 4 && (
                <div className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                  +{activeObjectives.length - 4} altri
                </div>
              )}
            </div>
          )}
        </SheetHeader>

        {/* Chat Area */}
        <ScrollArea className="flex-1 h-[calc(85vh-220px)]" ref={scrollRef}>
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
                    <span className="text-sm text-muted-foreground">Aria analizza i progressi...</span>
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
              placeholder="Racconta i tuoi progressi..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-glass border-glass-border"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0 bg-emerald-500 hover:bg-emerald-600"
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

export default ObjectiveUpdateModal;