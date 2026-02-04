import { useState, useCallback, useRef, useEffect } from 'react';
import { useConversation } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const useElevenLabsAgent = () => {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const conversationHistoryRef = useRef<Array<{ role: string; text: string }>>([]);

  // ElevenLabs useConversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected to agent');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected from agent');
    },
    onMessage: (message: any) => {
      console.log('[ElevenLabs] Message:', message);
      
      // Handle user transcript
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          transcriptRef.current.push({
            role: 'user',
            text: userText,
            timestamp: new Date()
          });
          conversationHistoryRef.current.push({
            role: 'user',
            text: userText
          });
          console.log('[ElevenLabs] User said:', userText);
        }
      }
      
      // Handle agent response
      if (message?.type === 'agent_response') {
        const agentText = message?.agent_response_event?.agent_response;
        if (agentText) {
          transcriptRef.current.push({
            role: 'assistant',
            text: agentText,
            timestamp: new Date()
          });
          conversationHistoryRef.current.push({
            role: 'assistant',
            text: agentText
          });
          console.log('[ElevenLabs] Aria said:', agentText);
        }
      }
    },
    onError: (error) => {
      console.error('[ElevenLabs] Error:', error);
      setError(typeof error === 'string' ? error : 'Errore di connessione');
      toast.error('Errore di connessione con Aria');
    },
    // Client tools - called by the ElevenLabs agent
    clientTools: {
      // This tool is called by the agent to get Aria's response
      aria_respond: async (params: { user_message: string }) => {
        console.log('[ElevenLabs] aria_respond called with:', params.user_message);
        
        try {
          const { data, error } = await supabase.functions.invoke('aria-agent-backend', {
            body: {
              message: params.user_message,
              conversationHistory: conversationHistoryRef.current.slice(-10)
            }
          });

          if (error) {
            console.error('[ElevenLabs] Backend error:', error);
            return "Mi dispiace, non riesco a rispondere in questo momento.";
          }

          const response = data?.response || "Scusa, puoi ripetere?";
          console.log('[ElevenLabs] Aria response:', response);
          return response;
          
        } catch (err) {
          console.error('[ElevenLabs] Error calling backend:', err);
          return "Scusa, c'è stato un problema. Puoi ripetere?";
        }
      }
    }
  });

  // Start conversation
  const start = useCallback(async () => {
    if (conversation.status === 'connected') {
      console.log('[ElevenLabs] Already connected');
      return;
    }

    setIsConnecting(true);
    setError(null);
    transcriptRef.current = [];
    conversationHistoryRef.current = [];

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[ElevenLabs] Microphone permission granted');

      // Get signed URL from our edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-conversation-token');

      if (tokenError || !data?.signed_url) {
        throw new Error(tokenError?.message || 'Failed to get conversation token');
      }

      console.log('[ElevenLabs] Got signed URL, starting session...');

      // Start the conversation session with WebSocket
      await conversation.startSession({
        signedUrl: data.signed_url
      });

      console.log('[ElevenLabs] Session started successfully');

    } catch (err) {
      console.error('[ElevenLabs] Failed to start:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione';
      setError(errorMessage);
      toast.error(`Impossibile avviare la conversazione: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  // Stop conversation
  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
      console.log('[ElevenLabs] Session ended');
      
      // Save session transcript if we have messages
      if (transcriptRef.current.length > 0 && user) {
        try {
          const transcript = transcriptRef.current
            .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
            .join('\n');
          
          // Create a session record
          await supabase.from('sessions').insert({
            user_id: user.id,
            type: 'voice',
            status: 'completed',
            start_time: transcriptRef.current[0]?.timestamp.toISOString(),
            end_time: new Date().toISOString(),
            transcript,
            ai_summary: 'Sessione vocale con Aria'
          });
          
          console.log('[ElevenLabs] Session saved');
        } catch (saveError) {
          console.error('[ElevenLabs] Failed to save session:', saveError);
        }
      }
    } catch (err) {
      console.error('[ElevenLabs] Error stopping:', err);
    }
  }, [conversation, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession().catch(console.error);
      }
    };
  }, [conversation]);

  return {
    // State
    isActive: conversation.status === 'connected',
    isConnecting,
    isSpeaking: conversation.isSpeaking,
    isListening: conversation.status === 'connected' && !conversation.isSpeaking,
    error,
    transcript: transcriptRef.current,
    
    // Computed audio level (for visualization)
    // ElevenLabs doesn't expose this directly, so we'll use a placeholder
    audioLevel: conversation.isSpeaking ? 0.7 : 0.3,
    
    // Actions
    start,
    stop
  };
};
