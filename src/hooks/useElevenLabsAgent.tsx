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

  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected');
      setError(null);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected');
      if (!userInitiatedStopRef.current) {
        setError('Connessione persa. Riprova.');
      }
    },
    onMessage: (message: any) => {
      if (message?.type === 'user_transcript') {
        const userText = message?.user_transcription_event?.user_transcript;
        if (userText) {
          transcriptRef.current.push({ role: 'user', text: userText, timestamp: new Date() });
          setTranscriptVersion(v => v + 1);
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

  const start = useCallback(async () => {
    if (conversation.status === 'connected') return;

    setIsConnecting(true);
    setError(null);
    transcriptRef.current = [];
    setTranscriptVersion(0);
    sessionStartTimeRef.current = new Date();
    userInitiatedStopRef.current = false;

    try {
      // 1. Mic permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Fetch dynamic context (lightweight, ~5-10k chars)
      const contextPromise = supabase.functions.invoke('elevenlabs-context');

      // 3. Start session with agentId ONLY (static prompt lives in ElevenLabs dashboard)
      //    This keeps the handshake payload minimal → no connection drops
      console.log('[ElevenLabs] Starting session with agentId (dashboard prompt)');
      
      const contextResult = await contextPromise;
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

      await conversation.startSession({
        agentId: AGENT_ID,
        overrides,
      } as any);
      
      console.log('[ElevenLabs] Session started successfully');

      // 4. Inject dynamic user context AFTER connection via sendContextualUpdate
      //    This doesn't break the connection because it's sent post-handshake
      if (dynamicContext) {
        try {
          console.log(`[ElevenLabs] Injecting dynamic context: ${dynamicContext.length} chars`);
          await (conversation as any).sendContextualUpdate?.(dynamicContext);
          console.log('[ElevenLabs] Dynamic context injected');
        } catch (ctxErr) {
          console.warn('[ElevenLabs] sendContextualUpdate failed (non-critical):', ctxErr);
        }
      }

    } catch (err) {
      console.error('[ElevenLabs] Failed to start:', err);
      
      // Fallback: try without any overrides
      try {
        console.log('[ElevenLabs] Retrying without overrides');
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

  const stop = useCallback(async () => {
    userInitiatedStopRef.current = true;
    
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
