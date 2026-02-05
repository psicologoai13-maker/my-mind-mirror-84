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
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const userContextRef = useRef<{ userName: string; userContext: string }>({ userName: 'Utente', userContext: '' });

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
      console.log('[ElevenLabs] Message received:', JSON.stringify(message, null, 2));
      
      // Handle user transcript
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          transcriptRef.current.push({
            role: 'user',
            text: userText,
            timestamp: new Date()
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
          console.log('[ElevenLabs] Aria said:', agentText);
        }
      }
    },
    onError: (error) => {
      console.error('[ElevenLabs] Error:', error);
      setError(typeof error === 'string' ? error : 'Errore di connessione');
    },
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
    sessionStartTimeRef.current = new Date();

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[ElevenLabs] Microphone permission granted');

      // Fetch user context for dynamic variables
      console.log('[ElevenLabs] Fetching user context...');
      const { data: contextData, error: contextError } = await supabase.functions.invoke('elevenlabs-context');
      
      if (contextError) {
        console.warn('[ElevenLabs] Context fetch warning:', contextError);
      }
      
      const userName = contextData?.user_name || 'Utente';
      const userContext = contextData?.user_context || 'Prima conversazione con Aria.';
      userContextRef.current = { userName, userContext };
      console.log('[ElevenLabs] User context loaded:', { userName, contextLength: userContext.length });

      // Get signed URL and agent ID from our edge function
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-conversation-token');
 
      if (tokenError || !data?.signed_url) {
        throw new Error(tokenError?.message || 'Failed to get conversation token');
      }

      console.log('[ElevenLabs] Got signed URL, starting WebSocket session...');

      // Start with signedUrl (WebSocket) - basic connection test
      await conversation.startSession({
        signedUrl: data.signed_url,
        connectionType: 'websocket'
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
      
       // Save session and process transcript if we have messages
      if (transcriptRef.current.length > 0 && user) {
        try {
          const transcript = transcriptRef.current
            .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
            .join('\n');
          
           // Create session record
           const { data: sessionData, error: insertError } = await supabase.from('sessions').insert({
            user_id: user.id,
            type: 'voice',
            status: 'completed',
             start_time: sessionStartTimeRef.current?.toISOString() || new Date().toISOString(),
            end_time: new Date().toISOString(),
            transcript,
            ai_summary: 'Sessione vocale con Aria'
           }).select('id').single();
          
           if (insertError) {
             console.error('[ElevenLabs] Failed to save session:', insertError);
           } else {
             sessionIdRef.current = sessionData?.id || null;
             console.log('[ElevenLabs] Session saved:', sessionIdRef.current);
             
             // Process session in background (extract 66 metrics, update memory)
             if (sessionIdRef.current) {
               console.log('[ElevenLabs] Processing session for clinical analysis...');
               supabase.functions.invoke('process-session', {
                 body: {
                   session_id: sessionIdRef.current,
                   user_id: user.id,
                   transcript,
                   is_voice: true
                 }
               }).then(({ error: processError }) => {
                 if (processError) {
                   console.error('[ElevenLabs] Process session error:', processError);
                 } else {
                   console.log('[ElevenLabs] Session processed successfully');
                 }
               });
             }
           }
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
    
     // Audio level for visualization
     audioLevel: conversation.isSpeaking ? 0.7 : (conversation.status === 'connected' ? 0.3 : 0.1),
    
    // Actions
    start,
    stop
  };
};
