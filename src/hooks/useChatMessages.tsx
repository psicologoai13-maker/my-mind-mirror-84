import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Type for chat_messages table row
interface ChatMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
  isOptimistic?: boolean;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => Promise<ChatMessage | null>;
  addOptimisticMessage: (role: 'user' | 'assistant' | 'system', content: string) => string;
  confirmMessage: (tempId: string, realMessage: ChatMessage) => void;
  removeOptimisticMessage: (tempId: string) => void;
  loadMessages: (sessionId: string) => Promise<void>;
}

/**
 * Checks if two messages are duplicates based on content and timestamp
 * Used to prevent double-rendering when optimistic UI meets real-time updates
 */
function isDuplicateMessage(
  existingMsg: ChatMessage, 
  newContent: string, 
  newRole: string,
  timestampMs: number
): boolean {
  if (existingMsg.content !== newContent) return false;
  if (existingMsg.role !== newRole) return false;
  
  // Check if timestamps are within 5 seconds of each other
  const existingTime = existingMsg.created_at.getTime();
  const timeDiff = Math.abs(existingTime - timestampMs);
  return timeDiff < 5000;
}

export function useChatMessages(sessionId: string | null): UseChatMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track real message IDs to prevent duplicates
  const realMessageIdsRef = useRef<Set<string>>(new Set());
  // Track optimistic message temp IDs
  const optimisticIdsRef = useRef<Set<string>>(new Set());

  // Load existing messages for a session
  const loadMessages = useCallback(async (sid: string) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }
      
      if (data) {
        const loadedMessages: ChatMessage[] = data.map((m: ChatMessageRow) => ({
          id: m.id,
          session_id: m.session_id,
          user_id: m.user_id,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          created_at: new Date(m.created_at),
          isOptimistic: false,
        }));
        
        // Track all real IDs
        realMessageIdsRef.current = new Set(loadedMessages.map(m => m.id));
        
        setMessages(prev => {
          // Keep ONLY optimistic messages that don't have a matching real message
          const optimisticToKeep = prev.filter(m => {
            if (!m.isOptimistic) return false;
            
            // Check if any loaded message is a duplicate of this optimistic one
            const hasDuplicate = loadedMessages.some(loaded => 
              isDuplicateMessage(loaded, m.content, m.role, m.created_at.getTime())
            );
            
            return !hasDuplicate;
          });
          
          return [...loadedMessages, ...optimisticToKeep];
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
    
    optimisticIdsRef.current.add(tempId);
    
    const optimisticMessage: ChatMessage = {
      id: tempId,
      session_id: sessionId || '',
      user_id: user?.id || '',
      role,
      content,
      created_at: new Date(),
      isOptimistic: true,
    };
    
    setMessages(prev => {
      // Before adding, check if there's already a message with same content (dedup)
      const alreadyExists = prev.some(m => 
        m.content === content && 
        m.role === role && 
        Math.abs(m.created_at.getTime() - optimisticMessage.created_at.getTime()) < 2000
      );
      
      if (alreadyExists) {
        return prev;
      }
      
      return [...prev, optimisticMessage];
    });
    
    return tempId;
  }, [sessionId, user?.id]);

  // Remove an optimistic message (e.g., on error)
  const removeOptimisticMessage = useCallback((tempId: string) => {
    optimisticIdsRef.current.delete(tempId);
    setMessages(prev => prev.filter(m => m.id !== tempId));
  }, []);

  // Confirm optimistic message with real data from DB
  const confirmMessage = useCallback((tempId: string, realMessage: ChatMessage) => {
    optimisticIdsRef.current.delete(tempId);
    realMessageIdsRef.current.add(realMessage.id);
    
    setMessages(prev => {
      // Find and replace the optimistic message
      const updated = prev.map(m => 
        m.id === tempId ? { ...realMessage, isOptimistic: false } : m
      );
      
      // Also remove any other duplicates that might have slipped through
      const seen = new Set<string>();
      return updated.filter(m => {
        // For real messages, use ID
        if (!m.isOptimistic) {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }
        
        // For optimistic, check content-based duplicates
        const key = `${m.role}:${m.content}:${Math.floor(m.created_at.getTime() / 2000)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }, []);

  // Add a new message and persist immediately to DB (used for AI responses)
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
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) {
        console.error('Error saving message:', error);
        return null;
      }

      if (!data) {
        console.error('No data returned from insert');
        return null;
      }

      const savedMessage: ChatMessage = {
        id: data.id,
        session_id: data.session_id,
        user_id: data.user_id,
        role: data.role as 'user' | 'assistant' | 'system',
        content: data.content,
        created_at: new Date(data.created_at),
        isOptimistic: false,
      };
      
      // Prevent duplicates: only add if not already tracked
      if (!realMessageIdsRef.current.has(savedMessage.id)) {
        realMessageIdsRef.current.add(savedMessage.id);
        
        setMessages(prev => {
          // Check for content-based duplicates before adding
          const isDupe = prev.some(m => 
            !m.isOptimistic &&
            m.content === savedMessage.content && 
            m.role === savedMessage.role &&
            Math.abs(m.created_at.getTime() - savedMessage.created_at.getTime()) < 3000
          );
          
          if (isDupe) {
            return prev;
          }
          
          return [...prev, savedMessage];
        });
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
      // Reset tracking on session change
      realMessageIdsRef.current.clear();
      optimisticIdsRef.current.clear();
      loadMessages(sessionId);
    } else {
      setMessages([]);
      realMessageIdsRef.current.clear();
      optimisticIdsRef.current.clear();
    }
  }, [sessionId, user?.id, loadMessages]);

  return {
    messages,
    isLoading,
    addMessage,
    addOptimisticMessage,
    confirmMessage,
    removeOptimisticMessage,
    loadMessages,
  };
}
