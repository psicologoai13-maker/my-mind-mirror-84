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
  
  // Context loaded from backend (for override injection)
  const contextRef = useRef<{ prompt: string; firstMessage: string } | null>(null);

  // Simple setup following ElevenLabs official docs exactly
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

      // 2. Fetch context for overrides (parallel with nothing else needed)
      const contextResult = await supabase.functions.invoke('elevenlabs-context');
      const contextData = contextResult.data || {};
      const systemPrompt = contextData.system_prompt || '';
      const firstMessage = contextData.first_message || '';
      
      contextRef.current = { prompt: systemPrompt, firstMessage };
      console.log(`[ElevenLabs] Context: ${systemPrompt.length} chars prompt, firstMessage: "${firstMessage}"`);

      // 3. Build overrides for this session
      const overrides: any = {};
      if (systemPrompt) {
        overrides.agent = {
          prompt: { prompt: systemPrompt },
          firstMessage: firstMessage || undefined,
          language: 'it',
        };
      }

      // 4. Start session following official docs:
      //    agentId + overrides in startSession
      console.log('[ElevenLabs] Starting session with agentId + overrides');
      await conversation.startSession({
        agentId: AGENT_ID,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      } as any);
      
      console.log('[ElevenLabs] Session started successfully');

    } catch (err) {
      console.error('[ElevenLabs] Failed to start:', err);
      
      // Fallback: try without overrides (use dashboard config)
      try {
        console.log('[ElevenLabs] Retrying without overrides (dashboard prompt)');
        await conversation.startSession({
          agentId: AGENT_ID,
        } as any);
        console.log('[ElevenLabs] Session started (dashboard prompt)');
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