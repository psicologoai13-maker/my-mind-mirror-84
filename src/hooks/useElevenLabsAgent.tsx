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
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const [transcriptVersion, setTranscriptVersion] = useState(0);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const volumeAnimRef = useRef<number>(0);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected to agent');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected from agent');
    },
    onMessage: (message: any) => {
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          transcriptRef.current.push({ role: 'user', text: userText, timestamp: new Date() });
          setTranscriptVersion(v => v + 1);
          console.log('[ElevenLabs] User said:', userText);
        }
      }
      if (message?.type === 'agent_response') {
        const agentText = message?.agent_response_event?.agent_response;
        if (agentText) {
          transcriptRef.current.push({ role: 'assistant', text: agentText, timestamp: new Date() });
          setTranscriptVersion(v => v + 1);
          console.log('[ElevenLabs] Aria said:', agentText);
        }
      }
    },
    onError: (error) => {
      console.error('[ElevenLabs] Error:', error);
      setError(typeof error === 'string' ? error : 'Errore di connessione');
    },
  });

  // Real-time audio level polling
  useEffect(() => {
    if (conversation.status !== 'connected') {
      setInputVolume(0);
      setOutputVolume(0);
      return;
    }

    const pollVolume = () => {
      try {
        const inVol = conversation.getInputVolume?.() ?? 0;
        const outVol = conversation.getOutputVolume?.() ?? 0;
        setInputVolume(inVol);
        setOutputVolume(outVol);
      } catch {
        // getInputVolume/getOutputVolume may not be available
      }
      volumeAnimRef.current = requestAnimationFrame(pollVolume);
    };
    
    volumeAnimRef.current = requestAnimationFrame(pollVolume);
    return () => cancelAnimationFrame(volumeAnimRef.current);
  }, [conversation.status]);

  const start = useCallback(async () => {
    if (conversation.status === 'connected') return;

    setIsConnecting(true);
    setError(null);
    transcriptRef.current = [];
    setTranscriptVersion(0);
    sessionStartTimeRef.current = new Date();

    try {
      // Parallel: mic permission + token + context
      const [, tokenResult, contextResult] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        supabase.functions.invoke('elevenlabs-conversation-token'),
        supabase.functions.invoke('elevenlabs-context'),
      ]);

      if (tokenResult.error || !tokenResult.data) {
        throw new Error(tokenResult.error?.message || 'Failed to get token');
      }

      const tokenData = tokenResult.data;
      const contextData = contextResult.data || {};
      
      console.log('[ElevenLabs] Context loaded:', contextData.user_name, `(${contextData.system_prompt?.length || 0} chars prompt)`);

      // Build overrides from context
      const overrides = contextData.system_prompt ? {
        agent: {
          prompt: { prompt: contextData.system_prompt },
          firstMessage: contextData.first_message || undefined,
          language: 'it',
        },
      } : undefined;

      // Strategy: try signedUrl + overrides first, then fallback to token without overrides
      let started = false;

      // Attempt 1: signedUrl (WebSocket) + overrides
      if (tokenData.signed_url) {
        try {
          const opts: any = { signedUrl: tokenData.signed_url };
          if (overrides) opts.overrides = overrides;
          console.log('[ElevenLabs] Attempting WebSocket + overrides');
          await conversation.startSession(opts);
          started = true;
          console.log('[ElevenLabs] Session started (WebSocket + overrides)');
        } catch (wsError) {
          console.warn('[ElevenLabs] WebSocket + overrides failed:', wsError);
        }
      }

      // Attempt 2: token (WebRTC) without overrides
      if (!started && tokenData.token) {
        try {
          console.log('[ElevenLabs] Attempting WebRTC without overrides (fallback)');
          await conversation.startSession({ conversationToken: tokenData.token });
          started = true;
          console.log('[ElevenLabs] Session started (WebRTC, dashboard prompt)');
        } catch (rtcError) {
          console.error('[ElevenLabs] WebRTC fallback also failed:', rtcError);
        }
      }

      // Attempt 3: signedUrl without overrides
      if (!started && tokenData.signed_url) {
        try {
          console.log('[ElevenLabs] Attempting WebSocket without overrides (last resort)');
          await conversation.startSession({ signedUrl: tokenData.signed_url });
          started = true;
          console.log('[ElevenLabs] Session started (WebSocket, no overrides)');
        } catch (lastError) {
          console.error('[ElevenLabs] All connection attempts failed:', lastError);
          throw lastError;
        }
      }

      if (!started) {
        throw new Error('No valid connection method available');
      }

    } catch (err) {
      console.error('[ElevenLabs] Failed to start:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione';
      setError(errorMessage);
      toast.error(`Impossibile avviare la conversazione: ${errorMessage}`);
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  const stop = useCallback(async () => {
    try {
      await conversation.endSession();
      console.log('[ElevenLabs] Session ended');
      
      // Save session and process transcript
      if (transcriptRef.current.length > 0 && user) {
        try {
          const transcript = transcriptRef.current
            .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
            .join('\n');
          
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
          } else if (sessionData?.id) {
            console.log('[ElevenLabs] Session saved:', sessionData.id);
            
            // Process session in background
            supabase.functions.invoke('process-session', {
              body: {
                session_id: sessionData.id,
                user_id: user.id,
                transcript,
                is_voice: true
              }
            }).then(({ error: processError }) => {
              if (processError) console.error('[ElevenLabs] Process session error:', processError);
              else console.log('[ElevenLabs] Session processed successfully');
            });
          }
        } catch (saveError) {
          console.error('[ElevenLabs] Failed to save session:', saveError);
        }
      }
    } catch (err) {
      console.error('[ElevenLabs] Error stopping:', err);
    }
  }, [conversation, user]);

  // Cleanup on unmount only
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  
  useEffect(() => {
    return () => {
      if (conversationRef.current.status === 'connected') {
        conversationRef.current.endSession().catch(console.error);
      }
    };
  }, []);

  return {
    isActive: conversation.status === 'connected',
    isConnecting,
    isSpeaking: conversation.isSpeaking,
    isListening: conversation.status === 'connected' && !conversation.isSpeaking,
    error,
    transcript: transcriptRef.current,
    
    // Real audio levels for visualization
    audioLevel: conversation.isSpeaking ? outputVolume : inputVolume,
    inputVolume,
    outputVolume,
    
    start,
    stop,
  };
};
