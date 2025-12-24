import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSessions } from './useSessions';
import { toast } from 'sonner';

interface UseRealtimeVoiceReturn {
  isActive: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  audioLevel: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export const useRealtimeVoice = (): UseRealtimeVoiceReturn => {
  const { user } = useAuth();
  const { startSession, endSession } = useSessions();
  
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const transcriptRef = useRef<string>('');
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsConnecting(true);
    console.log('[Realtime] Starting voice session...');

    try {
      // Create session in database
      const session = await startSession.mutateAsync('voice');
      if (!session) throw new Error('Failed to create session');
      sessionIdRef.current = session.id;
      console.log('[Realtime] Session created:', session.id);

      // Get ephemeral token from edge function
      console.log('[Realtime] Fetching ephemeral token...');
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('openai-realtime-session');
      
      if (tokenError || !tokenData?.client_secret?.value) {
        console.error('[Realtime] Token error:', tokenError, tokenData);
        throw new Error(tokenError?.message || 'Failed to get ephemeral token');
      }

      const ephemeralKey = tokenData.client_secret.value;
      console.log('[Realtime] Ephemeral token received');

      // Create audio element for playback
      audioElRef.current = document.createElement('audio');
      audioElRef.current.autoplay = true;

      // Create peer connection
      pcRef.current = new RTCPeerConnection();
      console.log('[Realtime] PeerConnection created');

      // Set up remote audio stream
      pcRef.current.ontrack = (e) => {
        console.log('[Realtime] Received remote track:', e.track.kind);
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0];
        }
      };

      // Get microphone access
      console.log('[Realtime] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      console.log('[Realtime] Microphone access granted');

      // Set up audio analyzer for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      updateAudioLevel();

      // Add local audio track
      stream.getTracks().forEach(track => {
        pcRef.current?.addTrack(track, stream);
      });

      // Set up data channel for events
      dcRef.current = pcRef.current.createDataChannel('oai-events');
      
      dcRef.current.onopen = () => {
        console.log('[Realtime] Data channel opened');
        setIsListening(true);
      };

      dcRef.current.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          console.log('[Realtime] Event received:', event.type);

          switch (event.type) {
            case 'response.audio.delta':
              setIsSpeaking(true);
              setIsListening(false);
              break;
            case 'response.audio.done':
              setIsSpeaking(false);
              setIsListening(true);
              break;
            case 'input_audio_buffer.speech_started':
              console.log('[Realtime] User started speaking');
              setIsListening(true);
              break;
            case 'input_audio_buffer.speech_stopped':
              console.log('[Realtime] User stopped speaking');
              break;
            case 'response.audio_transcript.delta':
              if (event.delta) {
                transcriptRef.current += event.delta;
              }
              break;
            case 'conversation.item.input_audio_transcription.completed':
              if (event.transcript) {
                transcriptRef.current += `\nTu: ${event.transcript}\n`;
              }
              break;
            case 'response.done':
              console.log('[Realtime] Response completed');
              break;
            case 'error':
              console.error('[Realtime] Error event:', event.error);
              toast.error(event.error?.message || 'Errore nella conversazione');
              break;
          }
        } catch (err) {
          console.error('[Realtime] Error parsing event:', err);
        }
      };

      dcRef.current.onerror = (err) => {
        console.error('[Realtime] Data channel error:', err);
      };

      // Create and set local description
      console.log('[Realtime] Creating offer...');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      // Connect to OpenAI Realtime API
      console.log('[Realtime] Connecting to OpenAI...');
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error('[Realtime] SDP response error:', errorText);
        throw new Error(`Failed to connect: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      const answer: RTCSessionDescriptionInit = {
        type: "answer",
        sdp: answerSdp,
      };
      
      await pcRef.current.setRemoteDescription(answer);
      console.log('[Realtime] WebRTC connection established!');

      setIsActive(true);
      setIsConnecting(false);
      toast.success('Connesso! Inizia a parlare');

    } catch (error) {
      console.error('[Realtime] Error starting session:', error);
      setIsConnecting(false);
      toast.error(error instanceof Error ? error.message : 'Errore di connessione');
      
      // Cleanup on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    }
  }, [user, startSession, updateAudioLevel]);

  const stop = useCallback(async () => {
    console.log('[Realtime] Stopping session...');

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clean up audio element
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }

    // End session in database
    if (sessionIdRef.current) {
      await endSession.mutateAsync({ 
        sessionId: sessionIdRef.current, 
        transcript: transcriptRef.current || undefined 
      });
      sessionIdRef.current = null;
    }

    // Reset state
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    setAudioLevel(0);
    transcriptRef.current = '';
    analyserRef.current = null;

    console.log('[Realtime] Session stopped');
  }, [endSession]);

  return {
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    audioLevel,
    start,
    stop
  };
};
