import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';
export type ConnectionMode = 'websocket' | 'fallback';

interface UseVoiceSessionOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
  onAudioLevel?: (level: number, isInput: boolean) => void;
  onError?: (error: string) => void;
}

// Audio constants for Gemini Live API
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export const useVoiceSession = (options: UseVoiceSessionOptions = {}) => {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [mode, setMode] = useState<ConnectionMode>('websocket');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedFallbackRef = useRef(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  
  // Fallback mode refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const updateStatus = useCallback((newStatus: VoiceSessionStatus) => {
    console.log('Status update:', newStatus);
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
  }, [options]);

  // Analyze audio level from Float32 data
  const analyzeAudioLevel = useCallback((dataArray: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += Math.abs(dataArray[i]);
    }
    return Math.min(1, (sum / dataArray.length) * 10);
  }, []);

  // Convert Float32 to PCM16 Int16 Little Endian and encode as Base64
  const float32ToPCM16Base64 = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Convert to Little Endian bytes
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }, []);

  // Convert PCM16 Int16 Little Endian bytes to Float32
  const pcm16ToFloat32 = useCallback((pcmData: Uint8Array): Float32Array => {
    const int16Array = new Int16Array(pcmData.length / 2);
    
    // Read Little Endian Int16
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Array[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Convert to Float32 [-1, 1]
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    
    return float32Array;
  }, []);

  // Play audio chunk immediately with zero latency
  const playAudioChunk = useCallback((float32Data: Float32Array) => {
    if (!playbackContextRef.current) return;
    
    const ctx = playbackContextRef.current;
    const buffer = ctx.createBuffer(1, float32Data.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32Data);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    // Schedule for immediate or sequential playback
    const now = ctx.currentTime;
    const startTime = Math.max(now, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
    
    options.onAudioLevel?.(0.6, false);
  }, [options]);

  // Process incoming audio from Gemini
  const processIncomingAudio = useCallback((base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const float32Data = pcm16ToFloat32(bytes);
      playAudioChunk(float32Data);
      
      updateStatus('speaking');
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }, [pcm16ToFloat32, playAudioChunk, updateStatus]);

  // Start WebSocket connection
  const startWebSocket = useCallback(async () => {
    updateStatus('connecting');
    setErrorMessage(null);
    hasTriedFallbackRef.current = false;
    
    try {
      // Get microphone access at 16kHz
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: INPUT_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Input context at 16kHz
      audioContextRef.current = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      // FORCE RESUME to unlock browser audio
      await audioContextRef.current.resume();
      
      // Playback context at 24kHz for Gemini output
      playbackContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      await playbackContextRef.current.resume();
      nextPlayTimeRef.current = 0;
      
      // Connect to edge function
      const wsUrl = `wss://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/gemini-voice`;
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      // Timeout for fallback - extended to 8 seconds
      connectionTimeoutRef.current = setTimeout(() => {
        if (status === 'connecting' && !hasTriedFallbackRef.current) {
          console.log('Connection timeout after 8s, switching to fallback');
          setErrorMessage('Timeout connessione. Passaggio a modalità alternativa...');
          wsRef.current?.close();
          hasTriedFallbackRef.current = true;
          startFallback();
        }
      }, 8000);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected to edge function');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received:', data.type || (data.setupComplete ? 'setupComplete' : 'content'));
          
          // Setup complete - start audio capture
          if (data.setupComplete) {
            console.log('Gemini ready with model:', data.model);
            
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            
            // Start audio capture
            sourceRef.current = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
            processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              if (isMuted) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              const audioLevel = analyzeAudioLevel(inputData);
              options.onAudioLevel?.(audioLevel, true);
              
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                const audioBase64 = float32ToPCM16Base64(new Float32Array(inputData));
                const message = {
                  realtimeInput: {
                    mediaChunks: [{
                      mimeType: "audio/pcm;rate=16000",
                      data: audioBase64
                    }]
                  }
                };
                wsRef.current.send(JSON.stringify(message));
              }
            };
            
            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
            
            updateStatus('listening');
            toast.success('Connesso! Inizia a parlare.');
            return;
          }
          
          // Handle audio response
          if (data.serverContent) {
            const parts = data.serverContent.modelTurn?.parts || [];
            
            for (const part of parts) {
              if (part.inlineData?.mimeType?.includes('audio')) {
                processIncomingAudio(part.inlineData.data);
              }
              
              if (part.text) {
                setTranscript(prev => [...prev, `AI: ${part.text}`]);
                options.onTranscript?.(part.text, false);
              }
            }
            
            if (data.serverContent.turnComplete) {
              console.log('Turn complete');
              updateStatus('listening');
            }
          }
          
          // Handle errors
          if (data.type === 'error') {
            console.error('Gemini error:', data.message);
            setErrorMessage(data.message);
            options.onError?.(data.message);
            
            if (!hasTriedFallbackRef.current) {
              hasTriedFallbackRef.current = true;
              wsRef.current?.close();
              startFallback();
            } else {
              updateStatus('error');
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        if (!hasTriedFallbackRef.current) {
          hasTriedFallbackRef.current = true;
          wsRef.current?.close();
          startFallback();
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        if (status !== 'idle' && mode === 'websocket' && !hasTriedFallbackRef.current) {
          updateStatus('idle');
        }
      };
      
    } catch (error) {
      console.error('Failed to start WebSocket mode:', error);
      const errMsg = error instanceof Error ? error.message : 'Errore accesso microfono';
      setErrorMessage(errMsg);
      options.onError?.(errMsg);
      
      if (!hasTriedFallbackRef.current) {
        hasTriedFallbackRef.current = true;
        startFallback();
      } else {
        updateStatus('error');
      }
    }
  }, [analyzeAudioLevel, float32ToPCM16Base64, isMuted, mode, options, processIncomingAudio, status, updateStatus]);

  // Fallback: Web Speech API + TTS
  const startFallback = useCallback(async () => {
    console.log('Starting fallback mode...');
    setMode('fallback');
    setErrorMessage(null);
    updateStatus('connecting');
    toast.info('Attivazione modalità voce alternativa...');
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported');
      }
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'it-IT';
      
      let finalTranscript = '';
      
      recognitionRef.current.onresult = async (event: any) => {
        let interim = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => [...prev, `Tu: ${finalTranscript}`]);
          options.onTranscript?.(finalTranscript, true);
          
          updateStatus('speaking');
          
          try {
            const response = await supabase.functions.invoke('ai-chat', {
              body: { 
                messages: [{ role: 'user', content: finalTranscript }],
                generateSummary: false
              }
            });
            
            if (response.error) throw response.error;
            
            const reader = response.data.getReader?.();
            let aiResponse = '';
            
            if (reader) {
              const decoder = new TextDecoder();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                      const parsed = JSON.parse(line.slice(6));
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) aiResponse += content;
                    } catch {}
                  }
                }
              }
            }
            
            if (aiResponse) {
              setTranscript(prev => [...prev, `AI: ${aiResponse}`]);
              options.onTranscript?.(aiResponse, false);
              
              synthRef.current = new SpeechSynthesisUtterance(aiResponse);
              synthRef.current.lang = 'it-IT';
              synthRef.current.rate = 1;
              
              synthRef.current.onend = () => {
                updateStatus('listening');
                if (recognitionRef.current && !isMuted) {
                  recognitionRef.current.start();
                }
              };
              
              recognitionRef.current?.stop();
              speechSynthesis.speak(synthRef.current);
            }
          } catch (error) {
            console.error('AI response error:', error);
            updateStatus('listening');
          }
          
          finalTranscript = '';
        }
      };
      
      recognitionRef.current.onstart = () => {
        updateStatus('listening');
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          updateStatus('error');
        }
      };
      
      recognitionRef.current.start();
      
    } catch (error) {
      console.error('Fallback mode failed:', error);
      updateStatus('error');
      toast.error('Impossibile avviare la modalità voce');
    }
  }, [isMuted, options, updateStatus]);

  // Start session
  const start = useCallback(async () => {
    setTranscript([]);
    audioQueueRef.current = [];
    await startWebSocket();
  }, [startWebSocket]);

  // Stop session
  const stop = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    speechSynthesis.cancel();
    
    updateStatus('idle');
    setMode('websocket');
    hasTriedFallbackRef.current = false;
  }, [updateStatus]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    status,
    mode,
    isMuted,
    transcript,
    errorMessage,
    start,
    stop,
    toggleMute
  };
};

// Type augmentation for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}