import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, TrendingUp, Loader2, X, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useObjectives, type Objective, CATEGORY_CONFIG } from '@/hooks/useObjectives';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  showQuickActions?: boolean; // Flag to show quick action buttons
}

interface ObjectiveUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate a contextual example based on objective category and title
const generateContextualExample = (objective: Objective): string => {
  const { category, title, unit, target_value, current_value } = objective;
  
  switch (category) {
    case 'body':
      if (title.toLowerCase().includes('peso') || title.toLowerCase().includes('dimagr')) {
        return `"Questa settimana peso ${current_value ? current_value - 0.5 : '...'} kg"`;
      }
      if (title.toLowerCase().includes('palestra') || title.toLowerCase().includes('allenament')) {
        return `"Sono andato in palestra 3 volte questa settimana"`;
      }
      return `"Ho fatto progressi con ${title}"`;
      
    case 'finance':
      if (title.toLowerCase().includes('risparm')) {
        return `"Ho messo da parte 100€ questo mese"`;
      }
      if (title.toLowerCase().includes('spesa') || title.toLowerCase().includes('budget')) {
        return `"Questa settimana ho speso solo 50€"`;
      }
      return `"Ho fatto progressi con ${title}"`;
      
    case 'study':
      if (title.toLowerCase().includes('voto') || title.toLowerCase().includes('esame')) {
        return `"Ho preso 28 all'esame di oggi"`;
      }
      return `"Ho studiato 2 ore per ${title}"`;
      
    case 'work':
      if (title.toLowerCase().includes('app') || title.toLowerCase().includes('progetto') || title.toLowerCase().includes('lanc')) {
        return `"Ho completato il design della landing page"`;
      }
      if (title.toLowerCase().includes('client') || title.toLowerCase().includes('vendita')) {
        return `"Ho acquisito 2 nuovi clienti"`;
      }
      return `"Ho fatto un passo avanti con ${title}"`;
      
    case 'mind':
      if (title.toLowerCase().includes('meditaz')) {
        return `"Ho meditato ogni giorno questa settimana"`;
      }
      return `"Mi sento più ${title.toLowerCase().includes('ansia') ? 'tranquillo' : 'concentrato'}"`;
      
    case 'relationships':
      return `"Ho passato più tempo di qualità con ${title.toLowerCase().includes('famiglia') ? 'la famiglia' : 'le persone care'}"`;
      
    case 'growth':
      if (title.toLowerCase().includes('libr') || title.toLowerCase().includes('lettur')) {
        return `"Ho finito un altro capitolo del libro"`;
      }
      return `"Ho imparato qualcosa di nuovo per ${title}"`;
      
    default:
      return `"Ho fatto progressi con ${title}"`;
  }
};

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
  const getInitialMessage = (): { content: string; showQuickActions: boolean } => {
    if (activeObjectives.length === 0) {
      return { 
        content: "Non hai ancora obiettivi attivi. Vuoi crearne uno nuovo?",
        showQuickActions: false 
      };
    }
    
    // List only the objectives (max 5)
    const objectivesList = activeObjectives
      .slice(0, 5)
      .map((obj, i) => `${i + 1}. **${obj.title}**`)
      .join('\n');
    
    // Generate contextual examples based on actual objectives
    const examples = activeObjectives
      .slice(0, 2)
      .map(obj => `- ${generateContextualExample(obj)}`)
      .join('\n');
    
    return { 
      content: `Ciao! 📊 Hai **${activeObjectives.length} obiettiv${activeObjectives.length === 1 ? 'o' : 'i'}** attiv${activeObjectives.length === 1 ? 'o' : 'i'}.\n\nSeleziona quale vuoi aggiornare, oppure raccontami i tuoi progressi. Ad esempio:\n${examples}`,
      showQuickActions: true 
    };
  };

  // Track if modal was just opened
  const wasOpenRef = useRef(false);

  // Hide/show bottom nav and reset when modal opens/closes
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Only reset on first open
      window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
      const initialMsg = getInitialMessage();
      setMessages([{
        id: '1',
        role: 'assistant',
        content: initialMsg.content,
        showQuickActions: initialMsg.showQuickActions,
      }]);
      setInputValue('');
      setTimeout(() => inputRef.current?.focus(), 300);
      wasOpenRef.current = true;
    } else if (!open) {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
      wasOpenRef.current = false;
    }
  }, [open, activeObjectives]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string, showQuickActions = false) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      showQuickActions,
    }]);
  };

  // Handle quick action button click - sends message about specific objective
  const handleQuickAction = (objective: Objective) => {
    const prompt = `Voglio aggiornare i progressi di "${objective.title}"`;
    setInputValue('');
    addMessage('user', prompt);
    
    // Trigger the send with this specific context
    handleSendMessageWithContent(prompt);
  };

  const handleSendMessageWithContent = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setIsLoading(true);

    try {
      // Build conversation history for API
      const chatHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      chatHistory.push({ role: 'user', content });

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    addMessage('user', userMessage);
    
    await handleSendMessageWithContent(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render quick action buttons for objectives
  const renderQuickActions = () => {
    if (activeObjectives.length === 0) return null;
    
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-3 space-y-2"
      >
        {activeObjectives.slice(0, 5).map((obj) => (
          <Button
            key={obj.id}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction(obj)}
            disabled={isLoading}
            className={cn(
              "w-full justify-between text-left h-auto py-3 px-4",
              "rounded-xl border-glass-border bg-glass/50 hover:bg-glass",
              "transition-all duration-200"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${CATEGORY_CONFIG[obj.category].color}20` }}
              >
                <span className="text-base">{CATEGORY_CONFIG[obj.category].emoji}</span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {obj.title}
                </p>
                {obj.ai_progress_estimate !== null && (
                  <p className="text-xs text-muted-foreground">
                    Progresso: {obj.ai_progress_estimate}%
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        ))}
      </motion.div>
    );
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
          
          {/* Active objectives pills - REMOVED from header since we show buttons in chat */}
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
                    "flex flex-col",
                    message.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-glass border border-glass-border rounded-bl-md"
                  )}>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* Quick action buttons after initial assistant message */}
                  {message.role === 'assistant' && message.showQuickActions && !isLoading && (
                    renderQuickActions()
                  )}
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
