import React, { forwardRef, memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';

interface ChatBubbleProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
  showAvatar?: boolean;
}

// Memoized markdown components to prevent re-renders
const markdownComponents: Components = {
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
};

const ChatBubble = memo(forwardRef<HTMLDivElement, ChatBubbleProps>(({ 
  content, 
  role, 
  timestamp,
  showAvatar = true 
}, ref) => {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  
  // System messages are displayed as centered info
  if (isSystem) {
    return (
      <div ref={ref} className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-2 animate-slide-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* AI Avatar - Left side */}
      {!isUser && showAvatar && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-aria flex items-center justify-center shadow-aria-glow">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3',
          isUser
            ? 'bg-glass backdrop-blur-xl border border-glass-border shadow-soft text-foreground rounded-2xl rounded-tr-none'
            : 'bg-gradient-aria-subtle text-foreground rounded-2xl rounded-tl-none shadow-glass border border-aria-violet/20'
        )}
      >
        {/* Markdown Content */}
        <div className={cn(
          'text-sm leading-relaxed prose prose-sm max-w-none',
          isUser ? 'prose-gray dark:prose-invert' : 'prose-gray',
          // Override prose styles for cleaner look
          '[&>p]:m-0 [&>p:not(:last-child)]:mb-2',
          '[&_strong]:font-semibold'
        )}>
          <ReactMarkdown components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <p
            className={cn(
              'text-[10px] mt-1.5 opacity-60',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {timestamp.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* User Avatar - Right side */}
      {isUser && showAvatar && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-glass backdrop-blur-sm border border-glass-border flex items-center justify-center shadow-soft">
          <User className="w-4 h-4 text-foreground" />
        </div>
      )}
    </div>
  );
}));

ChatBubble.displayName = 'ChatBubble';

export default ChatBubble;
