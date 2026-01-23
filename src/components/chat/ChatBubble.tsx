import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';

interface ChatBubbleProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
  showAvatar?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ 
  content, 
  role, 
  timestamp,
  showAvatar = true 
}) => {
  const isUser = role === 'user';
  const isSystem = role === 'system';
  
  // System messages are displayed as centered info
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-2 animate-slide-up',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* AI Avatar - Left side */}
      {!isUser && showAvatar && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-none'
            : 'bg-white text-gray-800 rounded-2xl rounded-tl-none shadow-sm border border-gray-100'
        )}
      >
        {/* Markdown Content */}
        <div className={cn(
          'text-sm leading-relaxed prose prose-sm max-w-none',
          isUser ? 'prose-invert' : 'prose-gray',
          // Override prose styles for cleaner look
          '[&>p]:m-0 [&>p:not(:last-child)]:mb-2',
          '[&_strong]:font-semibold',
          isUser ? '[&_strong]:text-white' : '[&_strong]:text-gray-900'
        )}>
          <ReactMarkdown
            components={{
              // Prevent default paragraph margin issues
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              // Style bold text
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              // Handle lists cleanly
              ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
            }}
          >
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
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
