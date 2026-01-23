import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
  isOptimistic?: boolean; // Flag for optimistic updates
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => Promise<ChatMessage | null>;
  addOptimisticMessage: (role: 'user' | 'assistant' | 'system', content: string) => string;
  confirmMessage: (tempId: string, realMessage: ChatMessage) => void;
  loadMessages: (sessionId: string) => Promise<void>;
}

export function useChatMessages(sessionId: string | null): UseChatMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messageIdsRef = useRef<Set<string>>(new Set());

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
        const loadedMessages = data.map(m => ({
          ...m,
          role: m.role as 'user' | 'assistant' | 'system',
          created_at: new Date(m.created_at),
        }));
        
        // Track IDs to prevent duplicates
        messageIdsRef.current = new Set(loadedMessages.map(m => m.id));
        
        setMessages(prev => {
          // Keep optimistic messages that aren't in the loaded data
          const optimisticMessages = prev.filter(m => m.isOptimistic && !messageIdsRef.current.has(m.id));
          return [...loadedMessages, ...optimisticMessages];
        });
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Add optimistic message immediately (no DB wait)
  const addOptimisticMessage = useCallback((
    role: 'user' | 'assistant' | 'system',
    content: string
  ): string => {
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage: ChatMessage = {
      id: tempId,
      session_id: sessionId || '',
      user_id: user?.id || '',
      role,
      content,
      created_at: new Date(),
      isOptimistic: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    return tempId;
  }, [sessionId, user?.id]);

  // Confirm optimistic message with real data from DB
  const confirmMessage = useCallback((tempId: string, realMessage: ChatMessage) => {
    setMessages(prev => prev.map(m => 
      m.id === tempId ? { ...realMessage, isOptimistic: false } : m
    ));
    messageIdsRef.current.add(realMessage.id);
  }, []);

  // Add a new message and persist immediately to DB
  const addMessage = useCallback(async (
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<ChatMessage | null> => {
    if (!sessionId || !user?.id) {
      console.error('Cannot add message: missing sessionId or user');
      return null;
    }

    const newMessage = {
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
          id: `fallback-${Date.now()}`,
          ...newMessage,
          created_at: new Date(),
        };
        
        // Avoid duplicates
        if (!messageIdsRef.current.has(fallbackMessage.id)) {
          setMessages(prev => [...prev, fallbackMessage]);
          messageIdsRef.current.add(fallbackMessage.id);
        }
        return fallbackMessage;
      }

      const savedMessage: ChatMessage = {
        ...data,
        role: data.role as 'user' | 'assistant' | 'system',
        created_at: new Date(data.created_at),
      };
      
      // Avoid duplicates
      if (!messageIdsRef.current.has(savedMessage.id)) {
        setMessages(prev => [...prev, savedMessage]);
        messageIdsRef.current.add(savedMessage.id);
      }
      
      return savedMessage;
    } catch (err) {
      console.error('Failed to save message:', err);
      return null;
    }
  }, [sessionId, user?.id]);

  // Load messages when sessionId changes
  useEffect(() => {
    if (sessionId && user?.id) {
      loadMessages(sessionId);
    } else {
      setMessages([]);
      messageIdsRef.current.clear();
    }
  }, [sessionId, user?.id, loadMessages]);

  return {
    messages,
    isLoading,
    addMessage,
    addOptimisticMessage,
    confirmMessage,
    loadMessages,
  };
}
