import { useState, useRef, useCallback, useEffect } from 'react';
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

  // Start WebSocket connection with fast fallback
  const startWebSocket = useCallback(async () => {
    updateStatus('connecting');
    setErrorMessage(null);
    hasTriedFallbackRef.current = false;
    
    try {
      // Get microphone access first
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
      await audioContextRef.current.resume();
      
      // Playback context at 24kHz for Gemini output
      playbackContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      await playbackContextRef.current.resume();
      nextPlayTimeRef.current = 0;
      
      // Connect to edge function
      const wsUrl = `wss://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/gemini-voice`;
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      
      // Fast timeout - 3 seconds then fallback
      connectionTimeoutRef.current = setTimeout(() => {
        if (status === 'connecting' && !hasTriedFallbackRef.current) {
          console.log('Connection timeout, switching to fallback');
          hasTriedFallbackRef.current = true;
          wsRef.current?.close();
          startFallback();
        }
      }, 3000);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Setup complete - start audio capture
          if (data.setupComplete) {
            console.log('Gemini ready:', data.model);
            
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
                wsRef.current.send(JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [{
                      mimeType: "audio/pcm;rate=16000",
                      data: audioBase64
                    }]
                  }
                }));
              }
            };
            
            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
            
            updateStatus('listening');
            toast.success('Connesso! Parla pure.');
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
              updateStatus('listening');
            }
          }
          
          // Handle errors - switch to fallback immediately
          if (data.type === 'error') {
            console.error('Gemini error:', data.message);
            setErrorMessage(data.message);
            
            if (!hasTriedFallbackRef.current) {
              hasTriedFallbackRef.current = true;
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
              }
              wsRef.current?.close();
              startFallback();
            }
          }
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };
      
      wsRef.current.onerror = () => {
        console.error('WebSocket error');
        if (!hasTriedFallbackRef.current) {
          hasTriedFallbackRef.current = true;
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          wsRef.current?.close();
          startFallback();
        }
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code);
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        // If closed unexpectedly and not in fallback, try fallback
        if (status !== 'idle' && !hasTriedFallbackRef.current && event.code !== 1000) {
          hasTriedFallbackRef.current = true;
          startFallback();
        }
      };
      
    } catch (error) {
      console.error('Failed to start:', error);
      const errMsg = error instanceof Error ? error.message : 'Errore accesso microfono';
      setErrorMessage(errMsg);
      
      if (!hasTriedFallbackRef.current) {
        hasTriedFallbackRef.current = true;
        startFallback();
      } else {
        updateStatus('error');
      }
    }
  }, [analyzeAudioLevel, float32ToPCM16Base64, isMuted, options, processIncomingAudio, status, updateStatus]);

  // Fallback: Web Speech API + Lovable AI + TTS (starts immediately)
  const startFallback = useCallback(async () => {
    console.log('Starting fallback mode (Web Speech + Lovable AI)');
    setMode('fallback');
    setErrorMessage(null);
    toast.info('Modalità voce alternativa attiva');
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Riconoscimento vocale non supportato dal browser');
      }
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Only final results
      recognitionRef.current.lang = 'it-IT';
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
        updateStatus('listening');
      };
      
      recognitionRef.current.onresult = async (event: any) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript.trim();
        
        if (!text) return;
        
        console.log('User said:', text);
        setTranscript(prev => [...prev, `Tu: ${text}`]);
        options.onTranscript?.(text, true);
        
        // Stop listening while AI responds
        recognitionRef.current?.stop();
        updateStatus('speaking');
        
        try {
          // Call Lovable AI via edge function
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ 
              messages: [{ role: 'user', content: text }]
            })
          });
          
          if (!response.ok) throw new Error('AI response failed');
          
          // Handle streaming response
          let aiResponse = '';
          const reader = response.body?.getReader();
          
          if (reader) {
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
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
            console.log('AI response:', aiResponse);
            setTranscript(prev => [...prev, `AI: ${aiResponse}`]);
            options.onTranscript?.(aiResponse, false);
            
            // Speak the response with TTS
            const utterance = new SpeechSynthesisUtterance(aiResponse);
            utterance.lang = 'it-IT';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            // Get Italian voice if available
            const voices = speechSynthesis.getVoices();
            const italianVoice = voices.find(v => v.lang.startsWith('it'));
            if (italianVoice) utterance.voice = italianVoice;
            
            utterance.onend = () => {
              console.log('TTS finished, resuming listening');
              updateStatus('listening');
              // Resume listening after speaking
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.log('Recognition restart error:', e);
                }
              }
            };
            
            utterance.onerror = (e) => {
              console.error('TTS error:', e);
              updateStatus('listening');
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch {}
              }
            };
            
            speechSynthesis.speak(utterance);
          } else {
            updateStatus('listening');
            recognitionRef.current?.start();
          }
          
        } catch (error) {
          console.error('AI call error:', error);
          toast.error('Errore nella risposta AI');
          updateStatus('listening');
          recognitionRef.current?.start();
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Permesso microfono negato');
          updateStatus('error');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          // Try to restart on other errors
          setTimeout(() => {
            if (recognitionRef.current && status === 'listening') {
              try {
                recognitionRef.current.start();
              } catch {}
            }
          }, 500);
        }
      };
      
      recognitionRef.current.onend = () => {
        // Auto-restart if still in listening mode
        if (status === 'listening' && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      };
      
      // Start immediately
      recognitionRef.current.start();
      
    } catch (error) {
      console.error('Fallback init error:', error);
      const msg = error instanceof Error ? error.message : 'Errore avvio modalità voce';
      setErrorMessage(msg);
      updateStatus('error');
      toast.error(msg);
    }
  }, [options, status, updateStatus]);

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