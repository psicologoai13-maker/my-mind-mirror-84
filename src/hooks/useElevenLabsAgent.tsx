import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  
  // Overrides state — set BEFORE startSession, used by useConversation
  const [agentOverrides, setAgentOverrides] = useState<any>(undefined);
  
  // Reconnect state
  const hasAttemptedReconnectRef = useRef(false);
  const userInitiatedStopRef = useRef(false);
  const cachedTokenDataRef = useRef<any>(null);

  // Overrides go in the HOOK (not startSession) per ElevenLabs SDK docs
  // See: https://github.com/elevenlabs/packages/issues/92
  const conversation = useConversation({
    overrides: agentOverrides,
    onConnect: () => {
      console.log('[ElevenLabs] Connected to agent');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected from agent');
      
      if (!userInitiatedStopRef.current && !hasAttemptedReconnectRef.current) {
        console.warn('[ElevenLabs] Unexpected disconnect — attempting reconnect');
        hasAttemptedReconnectRef.current = true;
        reconnectSession();
      } else if (!userInitiatedStopRef.current) {
        console.error('[ElevenLabs] Unexpected disconnect after reconnect — giving up');
        setError('Connessione persa. Riprova.');
      }
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

  // Reconnect using cached token (overrides already in hook state)
  const reconnectSession = useCallback(async () => {
    const tokenData = cachedTokenDataRef.current;
    if (!tokenData) {
      setError('Connessione persa. Riprova.');
      return;
    }

    try {
      // Try WebRTC first, then WebSocket — NO overrides in startSession
      if (tokenData.token) {
        try {
          console.log('[ElevenLabs] Reconnect: WebRTC (token)');
          await conversation.startSession({ conversationToken: tokenData.token });
          console.log('[ElevenLabs] Reconnect successful');
          return;
        } catch (e) {
          console.warn('[ElevenLabs] Reconnect WebRTC failed:', e);
        }
      }

      if (tokenData.signed_url) {
        try {
          console.log('[ElevenLabs] Reconnect: WebSocket (signedUrl)');
          await conversation.startSession({ signedUrl: tokenData.signed_url });
          console.log('[ElevenLabs] Reconnect successful');
          return;
        } catch (e) {
          console.warn('[ElevenLabs] Reconnect WebSocket failed:', e);
        }
      }

      setError('Impossibile riconnettersi. Riprova.');
    } catch (err) {
      console.error('[ElevenLabs] Reconnect failed:', err);
      setError('Connessione persa. Riprova.');
    }
  }, [conversation]);

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
    hasAttemptedReconnectRef.current = false;
    userInitiatedStopRef.current = false;

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
      
      cachedTokenDataRef.current = tokenData;
      
      console.log('[ElevenLabs] Context loaded:', contextData.user_name, `(${contextData.system_prompt?.length || 0} chars prompt)`);

      // Set overrides in HOOK STATE (not in startSession!)
      const rawPrompt = contextData.system_prompt || '';
      if (rawPrompt) {
        const overrides = {
          agent: {
            prompt: { prompt: rawPrompt },
            firstMessage: contextData.first_message || undefined,
            language: 'it',
          },
        };
        setAgentOverrides(overrides);
        console.log(`[ElevenLabs] Overrides set in hook: ${rawPrompt.length} chars prompt`);
        
        // Give React a tick to re-render the hook with new overrides
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // startSession: ONLY connection params, NO overrides
      let started = false;

      // Attempt 1: WebRTC (conversationToken)
      if (tokenData.token) {
        try {
          console.log('[ElevenLabs] Attempt 1: WebRTC (token)');
          await conversation.startSession({ conversationToken: tokenData.token });
          started = true;
          console.log('[ElevenLabs] Session started via WebRTC');
        } catch (rtcError) {
          console.warn('[ElevenLabs] WebRTC failed:', rtcError);
        }
      }

      // Attempt 2: WebSocket (signedUrl)
      if (!started && tokenData.signed_url) {
        try {
          console.log('[ElevenLabs] Attempt 2: WebSocket (signedUrl)');
          await conversation.startSession({ signedUrl: tokenData.signed_url });
          started = true;
          console.log('[ElevenLabs] Session started via WebSocket');
        } catch (wsError) {
          console.warn('[ElevenLabs] WebSocket failed:', wsError);
        }
      }

      // Attempt 3: signedUrl without anything else as last resort
      if (!started && tokenData.signed_url) {
        try {
          console.log('[ElevenLabs] Attempt 3: signedUrl retry');
          await conversation.startSession({ signedUrl: tokenData.signed_url });
          started = true;
          console.log('[ElevenLabs] Session started via signedUrl retry');
        } catch (lastError) {
          console.error('[ElevenLabs] All attempts failed:', lastError);
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
    userInitiatedStopRef.current = true;
    
    try {
      await conversation.endSession();
      console.log('[ElevenLabs] Session ended');
    } catch (err) {
      console.error('[ElevenLabs] Error stopping conversation:', err);
    }

    if (!user) {
      console.warn('[ElevenLabs] No user, skipping session save');
      return;
    }

    const startTime = sessionStartTimeRef.current || new Date();
    const endTime = new Date();
    const durationSec = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    const hasTranscript = transcriptRef.current.length > 0;
    
    const transcript = hasTranscript
      ? transcriptRef.current.map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`).join('\n')
      : '';

    const aiSummary = hasTranscript ? 'Sessione vocale con Aria' : 'Sessione vocale breve';
    
    console.log(`[ElevenLabs] Saving session: duration=${durationSec}s, transcriptEntries=${transcriptRef.current.length}`);

    try {
      const { data: sessionData, error: insertError } = await supabase.from('sessions').insert({
        user_id: user.id,
        type: 'voice',
        status: 'completed',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationSec,
        transcript: transcript || null,
        ai_summary: aiSummary,
      }).select('id').single();

      if (insertError) {
        console.error('[ElevenLabs] Failed to save session:', insertError);
        return;
      }

      console.log('[ElevenLabs] Session saved:', sessionData.id);

      if (hasTranscript && sessionData.id) {
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
  }, [conversation, user]);

  // Cleanup on unmount only
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  
  useEffect(() => {
    return () => {
      userInitiatedStopRef.current = true;
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
    
    audioLevel: conversation.isSpeaking ? outputVolume : inputVolume,
    inputVolume,
    outputVolume,
    
    start,
    stop,
  };
};