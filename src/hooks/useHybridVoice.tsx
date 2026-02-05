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
   const sessionIdRef = useRef<string | null>(null);
   const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
   const isProcessingRef = useRef(false);
   const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
   const pendingTextRef = useRef<string>('');
   const isIOSRef = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
 
   // Detect iOS
   useEffect(() => {
     isIOSRef.current = /iPad|iPhone|iPod/.test(navigator.userAgent);
    synthRef.current = window.speechSynthesis;
   }, []);
 
   // Cleanup on unmount
   useEffect(() => {
     return () => {
       if (recognitionRef.current) {
         recognitionRef.current.stop();
       }
      if (synthRef.current) {
        synthRef.current.cancel();
       }
       if (silenceTimeoutRef.current) {
         clearTimeout(silenceTimeoutRef.current);
       }
     };
   }, []);
 
  // Web Speech API TTS - voce browser (funzionante)
   const playTTS = useCallback(async (text: string): Promise<void> => {
     console.log('[HybridVoice] Playing TTS for:', text.substring(0, 50) + '...');
     setIsSpeaking(true);
     setIsListening(false);
 
    return new Promise((resolve, reject) => {
      try {
        if (!synthRef.current) {
          throw new Error('Speech synthesis not available');
        }

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        // Configure for Italian
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to find an Italian voice
        const voices = synthRef.current.getVoices();
        const italianVoice = voices.find(v => v.lang.startsWith('it')) || 
                            voices.find(v => v.lang === 'it-IT') ||
                            voices[0];
        
        if (italianVoice) {
          utterance.voice = italianVoice;
          console.log('[HybridVoice] Using voice:', italianVoice.name);
        }

        utterance.onend = () => {
          console.log('[HybridVoice] TTS finished');
          setIsSpeaking(false);
          utteranceRef.current = null;
          resolve();
        };

        utterance.onerror = (event) => {
          console.error('[HybridVoice] TTS error:', event);
          setIsSpeaking(false);
          utteranceRef.current = null;
          reject(event);
        };

        synthRef.current.speak(utterance);

      } catch (err) {
        console.error('[HybridVoice] TTS error:', err);
        setIsSpeaking(false);
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
 
    // Stop any ongoing speech synthesis
    if (synthRef.current) {
      synthRef.current.cancel();
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
      
      // Stop any ongoing speech
      if (synthRef.current) {
        synthRef.current.cancel();
      }
 
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