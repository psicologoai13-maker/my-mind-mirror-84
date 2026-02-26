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

// No prompt truncation — ElevenLabs handles large prompts fine.
// The disconnect-after-first-message bug is NOT caused by prompt size.

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
  
  // Reconnect state
  const hasAttemptedReconnectRef = useRef(false);
  const userInitiatedStopRef = useRef(false);
  const cachedOverridesRef = useRef<any>(null);
  const cachedTokenDataRef = useRef<any>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected to agent');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected from agent');
      
      // If user didn't initiate stop, attempt reconnect
      if (!userInitiatedStopRef.current && !hasAttemptedReconnectRef.current) {
        console.warn('[ElevenLabs] Unexpected disconnect — attempting reconnect with overrides');
        hasAttemptedReconnectRef.current = true;
        reconnectWithOverrides();
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

  // Reconnect preserving overrides
  const reconnectWithOverrides = useCallback(async () => {
    const tokenData = cachedTokenDataRef.current;
    const overrides = cachedOverridesRef.current;
    
    if (!tokenData) {
      console.error('[ElevenLabs] No cached token for reconnect');
      setError('Connessione persa. Riprova.');
      return;
    }

    try {
      // Strategy: try WebRTC with overrides first (more stable for reconnects)
      if (tokenData.token) {
        try {
          const opts: any = { conversationToken: tokenData.token };
          if (overrides) opts.overrides = overrides;
          console.log('[ElevenLabs] Reconnect: WebRTC + overrides');
          await conversation.startSession(opts);
          console.log('[ElevenLabs] Reconnect successful (WebRTC + overrides)');
          return;
        } catch (e) {
          console.warn('[ElevenLabs] Reconnect WebRTC+overrides failed:', e);
        }
      }

      // Fallback: signedUrl with overrides
      if (tokenData.signed_url) {
        try {
          const opts: any = { signedUrl: tokenData.signed_url };
          if (overrides) opts.overrides = overrides;
          console.log('[ElevenLabs] Reconnect: WebSocket + overrides');
          await conversation.startSession(opts);
          console.log('[ElevenLabs] Reconnect successful (WebSocket + overrides)');
          return;
        } catch (e) {
          console.warn('[ElevenLabs] Reconnect WebSocket+overrides failed:', e);
        }
      }

      // Last resort: token without overrides
      if (tokenData.token) {
        try {
          console.log('[ElevenLabs] Reconnect: WebRTC no overrides (last resort)');
          await conversation.startSession({ conversationToken: tokenData.token });
          console.log('[ElevenLabs] Reconnect successful (WebRTC, no overrides)');
          return;
        } catch (e) {
          console.error('[ElevenLabs] Reconnect last resort failed:', e);
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
      
      // Cache for reconnect
      cachedTokenDataRef.current = tokenData;
      
      console.log('[ElevenLabs] Context loaded:', contextData.user_name, `(${contextData.system_prompt?.length || 0} chars prompt)`);

      // Build overrides — truncate prompt for stability
      const rawPrompt = contextData.system_prompt || '';
      
      console.log(`[ElevenLabs] Using full prompt: ${rawPrompt.length} chars (no truncation)`);

      const overrides = rawPrompt ? {
        agent: {
          prompt: { prompt: rawPrompt },
          firstMessage: contextData.first_message || undefined,
          language: 'it',
        },
      } : undefined;

      // Cache overrides for reconnect
      cachedOverridesRef.current = overrides;

      // Connection strategy: WebRTC first (more stable), then WebSocket
      let started = false;

      // Attempt 1: WebRTC (conversationToken) + overrides — most stable
      if (tokenData.token) {
        try {
          const opts: any = { conversationToken: tokenData.token };
          if (overrides) opts.overrides = overrides;
          console.log('[ElevenLabs] Attempt 1: WebRTC + overrides');
          await conversation.startSession(opts);
          started = true;
          console.log('[ElevenLabs] Session started (WebRTC + overrides)');
        } catch (rtcError) {
          console.warn('[ElevenLabs] WebRTC + overrides failed:', rtcError);
        }
      }

      // Attempt 2: WebSocket (signedUrl) + overrides
      if (!started && tokenData.signed_url) {
        try {
          const opts: any = { signedUrl: tokenData.signed_url };
          if (overrides) opts.overrides = overrides;
          console.log('[ElevenLabs] Attempt 2: WebSocket + overrides');
          await conversation.startSession(opts);
          started = true;
          console.log('[ElevenLabs] Session started (WebSocket + overrides)');
        } catch (wsError) {
          console.warn('[ElevenLabs] WebSocket + overrides failed:', wsError);
        }
      }

      // Attempt 3: WebRTC without overrides
      if (!started && tokenData.token) {
        try {
          console.log('[ElevenLabs] Attempt 3: WebRTC without overrides (fallback)');
          await conversation.startSession({ conversationToken: tokenData.token });
          started = true;
          console.log('[ElevenLabs] Session started (WebRTC, dashboard prompt)');
        } catch (rtcError) {
          console.error('[ElevenLabs] WebRTC fallback failed:', rtcError);
        }
      }

      // Attempt 4: signedUrl without overrides
      if (!started && tokenData.signed_url) {
        try {
          console.log('[ElevenLabs] Attempt 4: WebSocket without overrides (last resort)');
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
    userInitiatedStopRef.current = true;
    
    try {
      await conversation.endSession();
      console.log('[ElevenLabs] Session ended');
    } catch (err) {
      console.error('[ElevenLabs] Error stopping conversation:', err);
    }

    // Always save session if user is authenticated
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
      userInitiatedStopRef.current = true; // prevent reconnect on unmount
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
