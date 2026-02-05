 import { useState, useRef, useCallback, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 import { useSessions } from './useSessions';
 import { toast } from 'sonner';
 
 interface TranscriptEntry {
   role: 'user' | 'assistant';
   text: string;
   timestamp: Date;
 }
 
 interface UseHybridVoiceReturn {
   isActive: boolean;
   isConnecting: boolean;
   isSpeaking: boolean;
   isListening: boolean;
   audioLevel: number;
   error: string | null;
   transcript: TranscriptEntry[];
   start: () => Promise<void>;
   stop: () => Promise<void>;
 }
 
 export const useHybridVoice = (): UseHybridVoiceReturn => {
   const { user } = useAuth();
   const { startSession, endSession } = useSessions();
   
   const [isActive, setIsActive] = useState(false);
   const [isConnecting, setIsConnecting] = useState(false);
   const [isSpeaking, setIsSpeaking] = useState(false);
   const [isListening, setIsListening] = useState(false);
   const [audioLevel, setAudioLevel] = useState(0);
   const [error, setError] = useState<string | null>(null);
   const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
 
  const recognitionRef = useRef<any>(null);
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const sessionIdRef = useRef<string | null>(null);
   const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
   const isProcessingRef = useRef(false);
   const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const pendingTextRef = useRef<string>('');
   const isIOSRef = useRef(false);
 
   // Detect iOS
   useEffect(() => {
     isIOSRef.current = /iPad|iPhone|iPod/.test(navigator.userAgent);
   }, []);
 
   // Cleanup on unmount
   useEffect(() => {
     return () => {
       if (recognitionRef.current) {
         recognitionRef.current.stop();
       }
       if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current = null;
       }
       if (silenceTimeoutRef.current) {
         clearTimeout(silenceTimeoutRef.current);
       }
     };
   }, []);
 
   const playTTS = useCallback(async (text: string): Promise<void> => {
     console.log('[HybridVoice] Playing TTS for:', text.substring(0, 50) + '...');
     setIsSpeaking(true);
     setIsListening(false);
 
     try {
      // Call ElevenLabs TTS edge function with streaming
       const response = await fetch(
         `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
           },
          body: JSON.stringify({ text, stream: true }),
         }
       );
 
       if (!response.ok) {
         throw new Error(`TTS error: ${response.status}`);
       }
 
      // Use MediaSource for streaming playback if supported, fallback to blob
      if ('MediaSource' in window && MediaSource.isTypeSupported('audio/mpeg')) {
        await playStreamingAudio(response);
      } else {
        // Fallback: wait for full audio
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        audioRef.current = new Audio(audioUrl);
        
        await new Promise<void>((resolve, reject) => {
          if (!audioRef.current) {
            reject(new Error('Audio not initialized'));
            return;
          }
          
          audioRef.current.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          
          audioRef.current.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            reject(e);
          };
          
          audioRef.current.play().catch(reject);
        });
      }
 
     } catch (err) {
       console.error('[HybridVoice] TTS error:', err);
       throw err;
     } finally {
       setIsSpeaking(false);
       audioRef.current = null;
     }
   }, []);

  // Streaming audio playback using MediaSource API
  const playStreamingAudio = useCallback(async (response: Response): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const mediaSource = new MediaSource();
        const audio = new Audio();
        audio.src = URL.createObjectURL(mediaSource);
        audioRef.current = audio;

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
            const reader = response.body?.getReader();
            
            if (!reader) {
              reject(new Error('No response body'));
              return;
            }

            // Start playing as soon as we have some data
            let hasStartedPlaying = false;

            const processChunk = async () => {
              const { done, value } = await reader.read();
              
              if (done) {
                // Wait for buffer to finish, then end stream
                sourceBuffer.addEventListener('updateend', () => {
                  if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                  }
                }, { once: true });
                return;
              }

              // Append chunk to buffer
              if (!sourceBuffer.updating) {
                sourceBuffer.appendBuffer(value);
              }

              // Start playing after first chunk
              if (!hasStartedPlaying && audio.readyState >= 2) {
                hasStartedPlaying = true;
                audio.play().catch(console.error);
              }

              // Wait for buffer to be ready, then process next chunk
              if (sourceBuffer.updating) {
                sourceBuffer.addEventListener('updateend', processChunk, { once: true });
              } else {
                await processChunk();
              }
            };

            await processChunk();

            // Start playing if not already started
            if (!hasStartedPlaying) {
              audio.play().catch(console.error);
            }

            // Resolve when audio ends
            audio.onended = () => {
              URL.revokeObjectURL(audio.src);
              resolve();
            };

            audio.onerror = (e) => {
              URL.revokeObjectURL(audio.src);
              reject(e);
            };

          } catch (err) {
            reject(err);
          }
        });

        mediaSource.addEventListener('error', reject);

      } catch (err) {
        reject(err);
      }
    });
  }, []);
 
   const processUserInput = useCallback(async (userText: string) => {
     if (!userText.trim() || isProcessingRef.current) return;
     
     isProcessingRef.current = true;
     console.log('[HybridVoice] Processing user input:', userText);
 
     // Add to transcript
     const userEntry: TranscriptEntry = { role: 'user', text: userText, timestamp: new Date() };
     setTranscript(prev => [...prev, userEntry]);
     conversationHistoryRef.current.push({ role: 'user', content: userText });
 
     try {
       // Call our Gemini-powered backend
       const { data, error: backendError } = await supabase.functions.invoke('aria-agent-backend', {
         body: {
           message: userText,
           conversationHistory: conversationHistoryRef.current.slice(-10)
         }
       });
 
       if (backendError) {
         throw new Error(backendError.message);
       }
 
       const assistantText = data?.response || "Scusa, non ho capito. Puoi ripetere?";
       console.log('[HybridVoice] Assistant response:', assistantText);
 
       // Add assistant response to transcript
       const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
       setTranscript(prev => [...prev, assistantEntry]);
       conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });
 
       // Play TTS
       await playTTS(assistantText);
 
       // Resume listening after speaking
       if (isActive && recognitionRef.current) {
         setIsListening(true);
         try {
           recognitionRef.current.start();
         } catch (e) {
           // Ignore if already started
         }
       }
 
     } catch (err) {
       console.error('[HybridVoice] Error processing input:', err);
       toast.error('Errore nella risposta');
       
       // Try to resume listening even on error
       if (isActive && recognitionRef.current) {
         setIsListening(true);
         try {
           recognitionRef.current.start();
         } catch (e) {
           // Ignore
         }
       }
     } finally {
       isProcessingRef.current = false;
     }
   }, [isActive, playTTS]);
 
   const setupSpeechRecognition = useCallback(() => {
     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
     
     if (!SpeechRecognition) {
       throw new Error('Speech recognition not supported');
     }
 
     const recognition = new SpeechRecognition();
     recognition.continuous = !isIOSRef.current; // Disable continuous on iOS
     recognition.interimResults = true;
     recognition.lang = 'it-IT';
     recognition.maxAlternatives = 1;
 
     recognition.onstart = () => {
       console.log('[HybridVoice] Recognition started');
       setIsListening(true);
       setAudioLevel(0.3);
     };
 
     recognition.onresult = (event) => {
       let finalTranscript = '';
       let interimTranscript = '';
 
       for (let i = event.resultIndex; i < event.results.length; i++) {
         const transcript = event.results[i][0].transcript;
         if (event.results[i].isFinal) {
           finalTranscript += transcript;
         } else {
           interimTranscript += transcript;
         }
       }
 
       // Update audio level based on speech activity
       if (interimTranscript) {
         setAudioLevel(0.6 + Math.random() * 0.3);
         pendingTextRef.current = interimTranscript;
         
         // Clear and reset silence timeout
         if (silenceTimeoutRef.current) {
           clearTimeout(silenceTimeoutRef.current);
         }
         
         // If browser doesn't fire speechend, process after silence
         // Reduced from 1.5s to 0.8s for faster response
         silenceTimeoutRef.current = setTimeout(() => {
           if (pendingTextRef.current && !isProcessingRef.current) {
             console.log('[HybridVoice] Silence timeout, processing:', pendingTextRef.current);
             const textToProcess = pendingTextRef.current;
             pendingTextRef.current = '';
             recognition.stop();
             processUserInput(textToProcess);
           }
         }, 800);
       }
 
       if (finalTranscript) {
         console.log('[HybridVoice] Final transcript:', finalTranscript);
         if (silenceTimeoutRef.current) {
           clearTimeout(silenceTimeoutRef.current);
         }
         pendingTextRef.current = '';
         recognition.stop();
         processUserInput(finalTranscript);
       }
     };
 
     recognition.onspeechend = () => {
       console.log('[HybridVoice] Speech ended');
       setAudioLevel(0.2);
     };
 
     recognition.onend = () => {
       console.log('[HybridVoice] Recognition ended');
       setAudioLevel(0);
       
       // Auto-restart on iOS or if still active and not processing
       if (isActive && !isProcessingRef.current && !isSpeaking) {
         setTimeout(() => {
           if (isActive && recognitionRef.current && !isProcessingRef.current) {
             try {
               recognitionRef.current.start();
             } catch (e) {
               console.log('[HybridVoice] Could not restart recognition');
             }
           }
         }, 100);
       }
     };
 
     recognition.onerror = (event) => {
       console.error('[HybridVoice] Recognition error:', event.error);
       
       if (event.error === 'no-speech') {
         // Restart listening
         if (isActive && !isProcessingRef.current) {
           setTimeout(() => {
             try {
               recognition.start();
             } catch (e) {
               // Ignore
             }
           }, 100);
         }
       } else if (event.error !== 'aborted') {
         setError(`Errore riconoscimento: ${event.error}`);
       }
     };
 
     return recognition;
   }, [isActive, isSpeaking, processUserInput]);
 
   const start = useCallback(async () => {
     if (!user) {
       toast.error('Devi essere autenticato');
       return;
     }
 
     setIsConnecting(true);
     setError(null);
     setTranscript([]);
     conversationHistoryRef.current = [];
 
     try {
       // Request microphone permission
       await navigator.mediaDevices.getUserMedia({ audio: true });
       console.log('[HybridVoice] Microphone permission granted');
 
       // Create session in database
       const session = await startSession.mutateAsync('voice');
       if (!session) throw new Error('Failed to create session');
       sessionIdRef.current = session.id;
       console.log('[HybridVoice] Session created:', session.id);
 
       // Setup speech recognition
       recognitionRef.current = setupSpeechRecognition();
       
       setIsActive(true);
       setIsConnecting(false);
       
       // Start listening
       recognitionRef.current.start();
       
       toast.success('Connesso! Inizia a parlare');
 
     } catch (err) {
       console.error('[HybridVoice] Error starting:', err);
       setIsConnecting(false);
       setError(err instanceof Error ? err.message : 'Errore di connessione');
       toast.error('Impossibile avviare la conversazione');
     }
   }, [user, startSession, setupSpeechRecognition]);
 
   const stop = useCallback(async () => {
     console.log('[HybridVoice] Stopping session...');
 
     // Clear timeouts
     if (silenceTimeoutRef.current) {
       clearTimeout(silenceTimeoutRef.current);
       silenceTimeoutRef.current = null;
     }
 
     // Stop recognition
     if (recognitionRef.current) {
       recognitionRef.current.stop();
       recognitionRef.current = null;
     }
 
     // Stop audio
     if (audioRef.current) {
       audioRef.current.pause();
       audioRef.current = null;
     }
 
     // Save session
     if (sessionIdRef.current && transcript.length > 0) {
       try {
         const fullTranscript = transcript
           .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
           .join('\n\n');
 
         await endSession.mutateAsync({
           sessionId: sessionIdRef.current,
           transcript: fullTranscript
         });
         
         // Process session for analysis
         await supabase.functions.invoke('process-session', {
           body: {
             session_id: sessionIdRef.current,
             user_id: user?.id,
             transcript: fullTranscript
           }
         });
 
         console.log('[HybridVoice] Session saved');
       } catch (err) {
         console.error('[HybridVoice] Error saving session:', err);
       }
     }
 
     sessionIdRef.current = null;
     setIsActive(false);
     setIsListening(false);
     setIsSpeaking(false);
     setAudioLevel(0);
     pendingTextRef.current = '';
     isProcessingRef.current = false;
 
     console.log('[HybridVoice] Session stopped');
   }, [transcript, endSession, user]);
 
   return {
     isActive,
     isConnecting,
     isSpeaking,
     isListening,
     audioLevel,
     error,
     transcript,
     start,
     stop
   };
 };
 
 // TypeScript declarations for Web Speech API
 declare global {
   interface Window {
     SpeechRecognition: any;
     webkitSpeechRecognition: any;
   }
 }