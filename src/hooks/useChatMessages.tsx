import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => Promise<ChatMessage | null>;
  loadMessages: (sessionId: string) => Promise<void>;
}

export function useChatMessages(sessionId: string | null): UseChatMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing messages for a session
  const loadMessages = useCallback(async (sid: string) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      if (data) {
        setMessages(data.map(m => ({
          ...m,
          role: m.role as 'user' | 'assistant' | 'system',
          created_at: new Date(m.created_at),
        })));
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Add a new message and persist immediately to DB
  const addMessage = useCallback(async (
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<ChatMessage | null> => {
    if (!sessionId || !user?.id) {
      console.error('Cannot add message: missing sessionId or user');
      return null;
    }

    const newMessage: Omit<ChatMessage, 'id' | 'created_at'> = {
      session_id: sessionId,
      user_id: user.id,
      role,
      content,
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        // Still add to local state for UX continuity
        const fallbackMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          ...newMessage,
          created_at: new Date(),
        };
        setMessages(prev => [...prev, fallbackMessage]);
        return fallbackMessage;
      }

      const savedMessage: ChatMessage = {
        ...data,
        role: data.role as 'user' | 'assistant' | 'system',
        created_at: new Date(data.created_at),
      };
      
      setMessages(prev => [...prev, savedMessage]);
      return savedMessage;
    } catch (err) {
      console.error('Failed to save message:', err);
      return null;
    }
  }, [sessionId, user?.id]);

  // Update a message content (for streaming AI responses)
  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, content } : m
    ));
  }, []);

  // Load messages when sessionId changes
  useEffect(() => {
    if (sessionId && user?.id) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, user?.id, loadMessages]);

  return {
    messages,
    isLoading,
    addMessage,
    loadMessages,
  };
}
