import React, { useState, useRef, useEffect } from 'react';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Mic, Paperclip, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    content: 'Ciao Marco! 👋 Sono qui per ascoltarti. Come stai oggi? C\'è qualcosa di cui vorresti parlare?',
    sender: 'ai',
    timestamp: new Date(Date.now() - 60000),
  },
];

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses = [
        'Capisco come ti senti. È completamente normale avere questi pensieri. Vuoi raccontarmi di più su cosa è successo?',
        'Grazie per aver condiviso questo con me. Sembra che tu stia attraversando un momento difficile. Cosa pensi potrebbe aiutarti a sentirti meglio?',
        'È importante riconoscere queste emozioni. Hai notato se ci sono situazioni specifiche che le scatenano?',
      ];
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <MobileLayout hideNav className="pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center shadow-soft">
                <span className="text-xl">🧠</span>
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">Dr. Serenity</h2>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-mood-excellent animate-pulse-soft" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex animate-slide-up',
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 shadow-soft',
                message.sender === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-card text-foreground rounded-bl-md border border-border'
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p
                className={cn(
                  'text-xs mt-1',
                  message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}
              >
                {message.timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card rounded-2xl px-4 py-3 shadow-soft border border-border rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Scrivi un messaggio..."
              className="w-full bg-muted rounded-full px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
          <Button
            variant="chat"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Chat;
