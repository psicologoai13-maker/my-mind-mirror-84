import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type VoiceSessionStatus = 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';
export type ConnectionMode = 'websocket' | 'fallback';

interface UseVoiceSessionOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
  onAudioLevel?: (level: number, isInput: boolean) => void;
}

export const useVoiceSession = (options: UseVoiceSessionOptions = {}) => {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [mode, setMode] = useState<ConnectionMode>('websocket');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  
  // Fallback mode refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const updateStatus = useCallback((newStatus: VoiceSessionStatus) => {
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
  }, [options]);

  // Audio level analyzer
  const analyzeAudioLevel = useCallback((dataArray: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += Math.abs(dataArray[i]);
    }
    return Math.min(1, (sum / dataArray.length) * 10);
  }, []);

  // PCM to WAV conversion for playback
  const createWavFromPCM = useCallback((pcmData: Uint8Array): Uint8Array => {
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }, []);

  // Audio queue playback
  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      updateStatus('listening');
      return;
    }

    isPlayingRef.current = true;
    updateStatus('speaking');
    const audioData = audioQueueRef.current.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      const arrayBuffer = wavData.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => playNextAudio();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      playNextAudio();
    }
  }, [createWavFromPCM, updateStatus]);

  // Encode audio for sending
  const encodeAudioForAPI = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }, []);

  // Start WebSocket connection
  const startWebSocket = useCallback(async () => {
    updateStatus('connecting');
    
    try {
      // Get microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Connect to edge function WebSocket
      const wsUrl = `wss://yzlszvvhbcasbzsaastq.supabase.co/functions/v1/gemini-voice`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        updateStatus('connected');
        
        // Start audio capture
        sourceRef.current = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
        processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
        
        processorRef.current.onaudioprocess = (e) => {
          if (isMuted || status === 'speaking') return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const audioLevel = analyzeAudioLevel(inputData);
          options.onAudioLevel?.(audioLevel, true);
          
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const audioBase64 = encodeAudioForAPI(new Float32Array(inputData));
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
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle setup complete
          if (data.setupComplete) {
            console.log('Gemini setup complete');
            return;
          }
          
          // Handle server content (audio/text responses)
          if (data.serverContent) {
            const parts = data.serverContent.modelTurn?.parts || [];
            
            for (const part of parts) {
              if (part.inlineData?.mimeType?.includes('audio')) {
                // Decode and queue audio for playback
                const binaryString = atob(part.inlineData.data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                audioQueueRef.current.push(bytes);
                options.onAudioLevel?.(0.5, false);
                
                if (!isPlayingRef.current) {
                  playNextAudio();
                }
              }
              
              if (part.text) {
                setTranscript(prev => [...prev, `AI: ${part.text}`]);
                options.onTranscript?.(part.text, false);
              }
            }
            
            // Check for turn complete
            if (data.serverContent.turnComplete) {
              console.log('Turn complete');
            }
          }
          
          // Handle errors
          if (data.type === 'error') {
            console.error('Gemini error:', data.message);
            throw new Error(data.message);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error, falling back to speech API:', error);
        wsRef.current?.close();
        startFallback();
      };
      
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code);
        if (status !== 'idle') {
          updateStatus('idle');
        }
      };
      
    } catch (error) {
      console.error('Failed to start WebSocket mode:', error);
      startFallback();
    }
  }, [analyzeAudioLevel, encodeAudioForAPI, isMuted, options, playNextAudio, status, updateStatus]);

  // Fallback: Web Speech API + Gemini Text + TTS
  const startFallback = useCallback(async () => {
    setMode('fallback');
    updateStatus('connecting');
    toast.info('Modalità voce alternativa attivata');
    
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
      
      recognitionRef.current.onresult = async (event) => {
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
          
          // Send to Gemini via existing AI chat
          updateStatus('speaking');
          
          try {
            const response = await supabase.functions.invoke('ai-chat', {
              body: { 
                messages: [{ role: 'user', content: finalTranscript }],
                generateSummary: false
              }
            });
            
            if (response.error) throw response.error;
            
            // Read response with TTS
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
              
              // Speak response
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
      
      recognitionRef.current.onerror = (event) => {
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

  // Start session (tries WebSocket first, then fallback)
  const start = useCallback(async () => {
    setTranscript([]);
    audioQueueRef.current = [];
    
    // Try WebSocket mode first
    await startWebSocket();
  }, [startWebSocket]);

  // Stop session
  const stop = useCallback(() => {
    // Cleanup WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Cleanup audio
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
    
    // Cleanup fallback
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    speechSynthesis.cancel();
    
    updateStatus('idle');
    setMode('websocket');
  }, [updateStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    if (mode === 'fallback' && recognitionRef.current) {
      if (!isMuted) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    }
  }, [isMuted, mode]);

  // Cleanup on unmount
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
    start,
    stop,
    toggleMute
  };
};

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
