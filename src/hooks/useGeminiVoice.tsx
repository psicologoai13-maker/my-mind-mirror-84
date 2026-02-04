import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSessions } from './useSessions';
import { useRealTimeContext } from './useRealTimeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
}

interface UseGeminiVoiceReturn {
  isActive: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  audioLevel: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

// Audio worklet processor code as a string
const workletProcessorCode = `
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.port.onmessage = (e) => {
      if (e.data.samples) {
        this.buffer.push(...e.data.samples);
      }
    };
  }
  
  process(inputs, outputs) {
    const output = outputs[0][0];
    if (output) {
      for (let i = 0; i < output.length; i++) {
        output[i] = this.buffer.length > 0 ? this.buffer.shift() : 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-player-processor', PCMPlayerProcessor);
`;

export const useGeminiVoice = (): UseGeminiVoiceReturn => {
  const { user } = useAuth();
  const { startSession, endSession } = useSessions();
  const { context: realTimeContext } = useRealTimeContext();
  
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Transcript management
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const currentAssistantTextRef = useRef<string>('');

  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Convert Float32Array to 16-bit PCM base64
  const float32ToPCM16Base64 = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }, []);

  // Decode base64 PCM to Float32Array (24kHz output from Gemini)
  const pcm16Base64ToFloat32 = useCallback((base64: string): Float32Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    return float32Array;
  }, []);

  // Process and save session
  const processSession = useCallback(async () => {
    if (!sessionIdRef.current || !user || transcriptRef.current.length === 0) {
      console.log('[GeminiVoice] No transcript to process');
      return;
    }

    const fullTranscript = transcriptRef.current
      .map(entry => `${entry.role === 'user' ? 'Utente' : 'Aria'}: ${entry.text}`)
      .join('\n\n');

    console.log('[GeminiVoice] Processing session with transcript:', fullTranscript.substring(0, 200) + '...');

    try {
      const { data, error } = await supabase.functions.invoke('process-session', {
        body: {
          session_id: sessionIdRef.current,
          user_id: user.id,
          transcript: fullTranscript
        }
      });

      if (error) {
        console.error('[GeminiVoice] Error processing session:', error);
        toast.error('Errore nel salvare la sessione');
      } else {
        console.log('[GeminiVoice] Session processed:', data);
        if (data.analysis) {
          toast.success(`Sessione salvata - Umore: ${data.analysis.mood_score}/10`);
        }
      }
    } catch (err) {
      console.error('[GeminiVoice] Error invoking process-session:', err);
    }
  }, [user]);

  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsConnecting(true);
    console.log('[GeminiVoice] Starting Gemini 2.5 Flash Native Audio session...');

    // Reset transcript
    transcriptRef.current = [];
    currentAssistantTextRef.current = '';

    try {
      // Create session in database
      const session = await startSession.mutateAsync('voice');
      if (!session) throw new Error('Failed to create session');
      sessionIdRef.current = session.id;
      console.log('[GeminiVoice] Session created:', session.id);

      // Create audio context for playback (24kHz for Gemini output)
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Create worklet for audio playback
      const blob = new Blob([workletProcessorCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioContextRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'pcm-player-processor');
      workletNodeRef.current.connect(audioContextRef.current.destination);

      // Get microphone access
      console.log('[GeminiVoice] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;
      console.log('[GeminiVoice] Microphone access granted');

      // Set up audio analyzer for visualization
      const inputContext = new AudioContext({ sampleRate: 16000 });
      const source = inputContext.createMediaStreamSource(stream);
      analyserRef.current = inputContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Create script processor for capturing audio (16kHz input for Gemini)
      processorRef.current = inputContext.createScriptProcessor(4096, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(inputContext.destination);

      // Connect to Gemini via edge function WebSocket
      // Pass real-time context as encoded query param
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const contextParam = encodeURIComponent(JSON.stringify(realTimeContext));
      const wsUrl = `${supabaseUrl.replace('https://', 'wss://')}/functions/v1/gemini-voice?user_id=${user.id}&realtime_context=${contextParam}`;
      console.log('[GeminiVoice] Connecting with real-time context...');
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('[GeminiVoice] WebSocket connected, waiting for setup...');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle setup complete
          if (data.type === 'setup_complete') {
            console.log('[GeminiVoice] Setup complete, model:', data.model);
            setIsActive(true);
            setIsConnecting(false);
            setIsListening(true);
            updateAudioLevel();
            toast.success('Connesso a Gemini! Inizia a parlare');
            
            // Start sending audio
            if (processorRef.current) {
              processorRef.current.onaudioprocess = (e) => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const base64Audio = float32ToPCM16Base64(inputData);
                  
                  wsRef.current.send(JSON.stringify({
                    realtimeInput: {
                      mediaChunks: [{
                        mimeType: "audio/pcm;rate=16000",
                        data: base64Audio
                      }]
                    }
                  }));
                }
              };
            }
            return;
          }

          // Handle error
          if (data.type === 'error') {
            console.error('[GeminiVoice] Error:', data.message);
            toast.error(data.message || 'Errore nella connessione');
            return;
          }

          // Handle server content (audio response)
          if (data.serverContent) {
            const serverContent = data.serverContent;
            
            // Check if AI is responding
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                // IGNORE Gemini's robotic audio - we'll use ElevenLabs TTS instead
                // Just collect the text
                if (part.text) {
                  currentAssistantTextRef.current += part.text;
                }
              }
            }
            
            // Turn complete - convert text to speech with ElevenLabs (Carla voice)
            if (serverContent.turnComplete && currentAssistantTextRef.current) {
              console.log('[GeminiVoice] Turn complete, using ElevenLabs TTS for:', currentAssistantTextRef.current.substring(0, 50) + '...');
              
              // Save to transcript
              const textToSpeak = currentAssistantTextRef.current;
              transcriptRef.current.push({
                role: 'assistant',
                text: textToSpeak
              });
              currentAssistantTextRef.current = '';
              
              // Play with ElevenLabs TTS (Carla voice) - async IIFE
              setIsSpeaking(true);
              setIsListening(false);
              
              (async () => {
                try {
                  const ttsResponse = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
                    {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                      },
                      body: JSON.stringify({ text: textToSpeak }),
                    }
                  );
                  
                  if (ttsResponse.ok) {
                    const ttsData = await ttsResponse.json();
                    // Play audio using data URI (browser natively decodes base64)
                    const audioUrl = `data:audio/mpeg;base64,${ttsData.audioContent}`;
                    const audio = new Audio(audioUrl);
                    
                    audio.onended = () => {
                      setIsSpeaking(false);
                      setIsListening(true);
                    };
                    
                    audio.onerror = () => {
                      console.error('[GeminiVoice] Audio playback error');
                      setIsSpeaking(false);
                      setIsListening(true);
                    };
                    
                    await audio.play();
                  } else {
                    console.error('[GeminiVoice] TTS request failed:', ttsResponse.status);
                    setIsSpeaking(false);
                    setIsListening(true);
                  }
                } catch (ttsError) {
                  console.error('[GeminiVoice] TTS error:', ttsError);
                  setIsSpeaking(false);
                  setIsListening(true);
                }
              })();
            } else if (serverContent.turnComplete) {
              // Turn complete but no text
              setIsSpeaking(false);
              setIsListening(true);
            }
            
            // Check for interruption
            if (serverContent.interrupted) {
              console.log('[GeminiVoice] Interrupted by user');
              setIsSpeaking(false);
              setIsListening(true);
            }
          }

          // Handle input transcription (user speech)
          if (data.inputTranscription?.text) {
            console.log('[GeminiVoice] User said:', data.inputTranscription.text);
            transcriptRef.current.push({
              role: 'user',
              text: data.inputTranscription.text
            });
          }

        } catch (err) {
          console.error('[GeminiVoice] Error parsing message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[GeminiVoice] WebSocket error:', error);
        toast.error('Errore di connessione WebSocket');
        setIsConnecting(false);
      };

      wsRef.current.onclose = (event) => {
        console.log('[GeminiVoice] WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000 && isActive) {
          toast.error('Connessione chiusa inaspettatamente');
        }
      };

    } catch (error) {
      console.error('[GeminiVoice] Error starting session:', error);
      setIsConnecting(false);
      toast.error(error instanceof Error ? error.message : 'Errore di connessione');
      
      // Cleanup on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    }
  }, [user, startSession, updateAudioLevel, float32ToPCM16Base64, pcm16Base64ToFloat32]);

  const stop = useCallback(async () => {
    console.log('[GeminiVoice] Stopping session...');

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Clean up audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Process and save the session
    await processSession();

    // End session in database
    if (sessionIdRef.current) {
      const fullTranscript = transcriptRef.current
        .map(entry => `${entry.role === 'user' ? 'Utente' : 'Aria'}: ${entry.text}`)
        .join('\n\n');
      
      await endSession.mutateAsync({ 
        sessionId: sessionIdRef.current, 
        transcript: fullTranscript || undefined 
      });
      sessionIdRef.current = null;
    }

    // Reset state
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    setAudioLevel(0);
    transcriptRef.current = [];
    currentAssistantTextRef.current = '';
    analyserRef.current = null;
    workletNodeRef.current = null;

    console.log('[GeminiVoice] Session stopped');
  }, [endSession, processSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
