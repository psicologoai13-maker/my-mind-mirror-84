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

const AGENT_ID = 'agent_2901khw977kbesesvd00yh2mbeyx';

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
  const userInitiatedStopRef = useRef(false);
  const contextInjectionTimeoutRef = useRef<number | null>(null);
  const pendingContextRef = useRef<string>('');
  const hasInjectedContextRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const autoReconnectAttemptedRef = useRef(false);
  const shouldAutoReconnectRef = useRef(false);
  const conversationInstanceRef = useRef<any>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected');
      connectedAtRef.current = Date.now();
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected');
      if (!userInitiatedStopRef.current) {
        const connectedForMs = connectedAtRef.current ? Date.now() - connectedAtRef.current : null;
        if (connectedForMs !== null && connectedForMs < 15000 && !autoReconnectAttemptedRef.current) {
          autoReconnectAttemptedRef.current = true;
          shouldAutoReconnectRef.current = true;
          setError('Connessione instabile, riconnessione...');
          return;
        }

        setError('Connessione persa. Riprova.');
      }
    },
    onMessage: (message: any) => {
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          transcriptRef.current.push({ role: 'user', text: userText, timestamp: new Date() });
          setTranscriptVersion(v => v + 1);

          if (pendingContextRef.current && !hasInjectedContextRef.current) {
            const contextToInject = pendingContextRef.current;
            pendingContextRef.current = '';
            hasInjectedContextRef.current = true;

            window.setTimeout(async () => {
              if (conversationInstanceRef.current?.status !== 'connected') return;
              try {
                console.log(`[ElevenLabs] Injecting deferred context after first user transcript: ${contextToInject.length} chars`);
                await conversationInstanceRef.current?.sendContextualUpdate?.(contextToInject);
                console.log('[ElevenLabs] Deferred dynamic context injected');
              } catch (ctxErr) {
                console.warn('[ElevenLabs] Deferred sendContextualUpdate failed (non-critical):', ctxErr);
              }
            }, 350);
          }
        }
      }
      if (message?.type === 'agent_response') {
        const agentText = message?.agent_response_event?.agent_response;
        if (agentText) {
          transcriptRef.current.push({ role: 'assistant', text: agentText, timestamp: new Date() });
          setTranscriptVersion(v => v + 1);
        }
      }
    },
    onError: (error) => {
      console.error('[ElevenLabs] Error:', error);
      setError(typeof error === 'string' ? error : 'Errore di connessione');
    },
  });
  conversationInstanceRef.current = conversation;

  // Audio level polling
  useEffect(() => {
    if (conversation.status !== 'connected') {
      setInputVolume(0);
      setOutputVolume(0);
      return;
    }
    const pollVolume = () => {
      try {
        setInputVolume(conversation.getInputVolume?.() ?? 0);
        setOutputVolume(conversation.getOutputVolume?.() ?? 0);
      } catch {}
      volumeAnimRef.current = requestAnimationFrame(pollVolume);
    };
    volumeAnimRef.current = requestAnimationFrame(pollVolume);
    return () => cancelAnimationFrame(volumeAnimRef.current);
  }, [conversation.status]);

  const start = useCallback(async (isRecovery = false) => {
    if (conversation.status === 'connected') return;

    setIsConnecting(true);
    setError(null);
    if (!isRecovery) {
      transcriptRef.current = [];
      setTranscriptVersion(0);
      autoReconnectAttemptedRef.current = false;
    }
    sessionStartTimeRef.current = new Date();
    userInitiatedStopRef.current = false;
    shouldAutoReconnectRef.current = false;
    hasInjectedContextRef.current = false;
    pendingContextRef.current = '';

    try {
      // 1. Mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Fetch token + context in parallel
      console.log('[ElevenLabs] Fetching token and context...');
      const [tokenResult, contextResult] = await Promise.all([
        supabase.functions.invoke('elevenlabs-conversation-token', {
          body: { agentId: AGENT_ID }
        }),
        supabase.functions.invoke('elevenlabs-context'),
      ]);

      const tokenData = tokenResult.data || {};
      const contextData = contextResult.data || {};
      const firstMessage = contextData.first_message || '';
      const dynamicContext = contextData.dynamic_context || '';

      // Build lightweight overrides: only firstMessage + language
      const overrides: any = {
        agent: {
          firstMessage: firstMessage || undefined,
          language: 'it',
        },
      };

      // 3. Connect using WebRTC token first (more stable on mobile), then WS signed URL
      if (tokenData.token) {
        console.log('[ElevenLabs] Starting session with conversation token (WebRTC)');
        await conversation.startSession({
          conversationToken: tokenData.token,
          connectionType: 'webrtc',
          overrides,
        } as any);
      } else if (tokenData.signed_url) {
        console.log('[ElevenLabs] Starting session with signed URL (WebSocket)');
        await conversation.startSession({
          signedUrl: tokenData.signed_url,
          connectionType: 'websocket',
          overrides,
        } as any);
      } else {
        // Last resort: try agentId directly (public agent)
        console.log('[ElevenLabs] No token/URL, trying agentId directly');
        await conversation.startSession({
          agentId: AGENT_ID,
          overrides,
        } as any);
      }
      
      console.log('[ElevenLabs] Session started successfully');

      // 4. Queue dynamic context for safer deferred injection (after user transcript)
      if (dynamicContext) {
        try {
          const sanitizedContext = dynamicContext
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 600);

          pendingContextRef.current = sanitizedContext;
          hasInjectedContextRef.current = false;

          if (contextInjectionTimeoutRef.current) {
            window.clearTimeout(contextInjectionTimeoutRef.current);
          }

          // Fallback injection only if user doesn't speak for a while
          contextInjectionTimeoutRef.current = window.setTimeout(async () => {
            if (!pendingContextRef.current || hasInjectedContextRef.current) return;
            if (conversationInstanceRef.current?.status !== 'connected') return;

            const fallbackContext = pendingContextRef.current;
            pendingContextRef.current = '';
            hasInjectedContextRef.current = true;

            try {
              console.log(`[ElevenLabs] Injecting fallback deferred context: ${fallbackContext.length} chars`);
              await conversationInstanceRef.current?.sendContextualUpdate?.(fallbackContext);
              console.log('[ElevenLabs] Fallback deferred context injected');
            } catch (ctxErr) {
              console.warn('[ElevenLabs] Fallback sendContextualUpdate failed (non-critical):', ctxErr);
            }
          }, 6500);
        } catch (ctxErr) {
          console.warn('[ElevenLabs] Context sanitization failed (non-critical):', ctxErr);
        }
      }

    } catch (err) {
      console.error('[ElevenLabs] Failed to start:', err);
      
      // Fallback: try agentId directly without overrides
      try {
        console.log('[ElevenLabs] Retrying with agentId only');
        await conversation.startSession({
          agentId: AGENT_ID,
        } as any);
        console.log('[ElevenLabs] Session started (fallback)');
      } catch (fallbackErr) {
        console.error('[ElevenLabs] Fallback also failed:', fallbackErr);
        const errorMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Errore di connessione';
        setError(errorMessage);
        toast.error(`Impossibile avviare Aria: ${errorMessage}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [conversation]);

  useEffect(() => {
    if (conversation.status === 'disconnected' && shouldAutoReconnectRef.current) {
      shouldAutoReconnectRef.current = false;
      window.setTimeout(() => {
        start(true).catch((err) => {
          console.error('[ElevenLabs] Auto-reconnect failed:', err);
          setError('Connessione persa. Riprova.');
        });
      }, 250);
    }
  }, [conversation.status, start]);

  const stop = useCallback(async () => {
    userInitiatedStopRef.current = true;
    if (contextInjectionTimeoutRef.current) {
      window.clearTimeout(contextInjectionTimeoutRef.current);
      contextInjectionTimeoutRef.current = null;
    }
    pendingContextRef.current = '';
    hasInjectedContextRef.current = false;
    connectedAtRef.current = null;
    
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('[ElevenLabs] Error stopping:', err);
    }

    // Save session
    if (!user) return;

    const startTime = sessionStartTimeRef.current || new Date();
    const endTime = new Date();
    const durationSec = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    const hasTranscript = transcriptRef.current.length > 0;
    
    const transcript = hasTranscript
      ? transcriptRef.current.map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`).join('\n')
      : '';

    try {
      const { data: sessionData, error: insertError } = await supabase.from('sessions').insert({
        user_id: user.id,
        type: 'voice',
        status: 'completed',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationSec,
        transcript: transcript || null,
        ai_summary: hasTranscript ? 'Sessione vocale con Aria' : 'Sessione vocale breve',
      }).select('id').single();

      if (insertError) {
        console.error('[ElevenLabs] Save error:', insertError);
        return;
      }

      if (hasTranscript && sessionData?.id) {
        supabase.functions.invoke('process-session', {
          body: { session_id: sessionData.id, user_id: user.id, transcript, is_voice: true }
        }).catch(e => console.error('[ElevenLabs] Process error:', e));
      }
    } catch (saveError) {
      console.error('[ElevenLabs] Save failed:', saveError);
    }
  }, [conversation, user]);

  // Cleanup on unmount
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  useEffect(() => {
    return () => {
      userInitiatedStopRef.current = true;
      if (contextInjectionTimeoutRef.current) {
        window.clearTimeout(contextInjectionTimeoutRef.current);
        contextInjectionTimeoutRef.current = null;
      }
      pendingContextRef.current = '';
      hasInjectedContextRef.current = false;
      connectedAtRef.current = null;
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
