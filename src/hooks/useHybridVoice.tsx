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

// Detect platform at module level
const detectPlatform = () => {
  if (typeof navigator === 'undefined') return { isIOS: false, isSafari: false, isIOSSafari: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOSSafari = isIOS && /WebKit/i.test(ua) && !/CriOS/i.test(ua);
  return { isIOS, isSafari, isIOSSafari };
};

const PLATFORM = detectPlatform();

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const isRestartingRef = useRef(false); // Prevent double restarts
  const lastSpeechTimeRef = useRef<number>(0);

  // Keep ref in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
 
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Convert base64 to Blob
  const base64ToBlob = useCallback((base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }, []);

  // Play audio with iOS compatibility
  const playAudio = useCallback(async (audioBase64: string | null, mimeType: string, fallbackText: string): Promise<void> => {
    console.log('[HybridVoice] Playing audio, iOS:', PLATFORM.isIOS);
    setIsSpeaking(true);
    setIsListening(false);

    const useBrowserTTS = () => {
      return new Promise<void>((resolve) => {
        console.log('[HybridVoice] Using browser TTS');
        window.speechSynthesis?.cancel();
        
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.lang = 'it-IT';
        utterance.rate = 1.0;
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      });
    };

    if (!audioBase64) {
      console.log('[HybridVoice] No audio data, using TTS');
      return useBrowserTTS();
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      const audioBlob = base64ToBlob(audioBase64, mimeType || 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('[HybridVoice] Created blob URL, size:', audioBlob.size);
      
      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.preload = 'auto';
      
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        const cleanup = () => {
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };

        audio.onended = () => {
          console.log('[HybridVoice] Audio playback finished');
          setIsSpeaking(false);
          cleanup();
          resolve();
        };

        audio.onerror = (e) => {
          console.log('[HybridVoice] Audio error:', e, 'falling back to TTS');
          setIsSpeaking(false);
          cleanup();
          useBrowserTTS().then(resolve);
        };

        audio.src = audioUrl;
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise) {
          playPromise
            .then(() => console.log('[HybridVoice] Audio playing'))
            .catch((err) => {
              console.log('[HybridVoice] Play failed:', err.message);
              setIsSpeaking(false);
              cleanup();
              useBrowserTTS().then(resolve);
            });
        }
      });
    } catch (err) {
      console.log('[HybridVoice] Audio setup failed, using TTS');
      return useBrowserTTS();
    }
  }, [base64ToBlob]);

  // Process user input - extracted to avoid closure issues
  const processUserInput = useCallback(async (userText: string) => {
    if (!userText.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    console.log('[HybridVoice] Processing:', userText);

    // Stop recognition during processing
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const userEntry: TranscriptEntry = { role: 'user', text: userText, timestamp: new Date() };
    setTranscript(prev => [...prev, userEntry]);
    conversationHistoryRef.current.push({ role: 'user', content: userText });

    try {
      const { data, error: backendError } = await supabase.functions.invoke('aria-voice-chat', {
        body: {
          message: userText,
          conversationHistory: conversationHistoryRef.current.slice(-10).map(m => ({
            role: m.role,
            text: m.content
          }))
        }
      });

      if (backendError) throw new Error(backendError.message);

      const assistantText = data?.text || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[HybridVoice] Response:', assistantText);

      const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
      setTranscript(prev => [...prev, assistantEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });

      await playAudio(data?.audio || null, data?.mimeType || 'audio/mpeg', assistantText);

    } catch (err) {
      console.error('[HybridVoice] Process error:', err);
      toast.error('Errore nella risposta');
    } finally {
      isProcessingRef.current = false;
      // Restart listening after processing completes
      if (isActiveRef.current) {
        startListening();
      }
    }
  }, [playAudio]);

  // Centralized function to start/restart recognition
  const startListening = useCallback(() => {
    if (!isActiveRef.current || isProcessingRef.current || isRestartingRef.current) {
      console.log('[HybridVoice] Skip startListening - not ready');
      return;
    }

    isRestartingRef.current = true;
    console.log('[HybridVoice] Starting listening...');

    // Stop existing recognition first
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    // Delay for iOS stability
    const delay = PLATFORM.isIOS || PLATFORM.isSafari ? 300 : 100;
    
    setTimeout(() => {
      if (!isActiveRef.current) {
        isRestartingRef.current = false;
        return;
      }

      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // iOS Safari MUST use non-continuous mode
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'it-IT';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('[HybridVoice] Recognition onstart');
          setIsListening(true);
          setAudioLevel(0.3);
          isRestartingRef.current = false;
        };

        recognition.onaudiostart = () => {
          console.log('[HybridVoice] Audio capture started');
        };

        recognition.onspeechstart = () => {
          console.log('[HybridVoice] Speech detected!');
          lastSpeechTimeRef.current = Date.now();
          setAudioLevel(0.6);
        };

        recognition.onresult = (event: any) => {
          console.log('[HybridVoice] Got result event');
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += text;
            } else {
              interimTranscript += text;
            }
          }

          console.log('[HybridVoice] Interim:', interimTranscript, 'Final:', finalTranscript);

          if (interimTranscript) {
            setAudioLevel(0.7 + Math.random() * 0.2);
            pendingTextRef.current = interimTranscript;
            lastSpeechTimeRef.current = Date.now();
            
            // Clear existing timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            
            // Set new timeout - longer for iOS
            const silenceDelay = PLATFORM.isIOS ? 800 : 500;
            silenceTimeoutRef.current = setTimeout(() => {
              if (pendingTextRef.current && !isProcessingRef.current) {
                const text = pendingTextRef.current;
                pendingTextRef.current = '';
                console.log('[HybridVoice] Processing after silence:', text);
                processUserInput(text);
              }
            }, silenceDelay);
          }

          if (finalTranscript) {
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            pendingTextRef.current = '';
            console.log('[HybridVoice] Processing final:', finalTranscript);
            processUserInput(finalTranscript);
          }
        };

        recognition.onspeechend = () => {
          console.log('[HybridVoice] Speech ended');
          setAudioLevel(0.2);
        };

        recognition.onend = () => {
          console.log('[HybridVoice] Recognition onend');
          setAudioLevel(0);
          setIsListening(false);
          
          // Only auto-restart if active and not processing
          if (isActiveRef.current && !isProcessingRef.current && !isRestartingRef.current) {
            // Check if we got any speech - if not, restart
            const timeSinceSpeech = Date.now() - lastSpeechTimeRef.current;
            console.log('[HybridVoice] Time since last speech:', timeSinceSpeech);
            
            // Restart listening
            setTimeout(() => {
              if (isActiveRef.current && !isProcessingRef.current) {
                startListening();
              }
            }, PLATFORM.isIOS ? 500 : 200);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('[HybridVoice] Recognition error:', event.error);
          isRestartingRef.current = false;
          
          if (event.error === 'not-allowed') {
            setError('Permesso microfono negato');
            toast.error('Abilita il microfono nelle impostazioni');
            setIsActive(false);
            isActiveRef.current = false;
            return;
          }
          
          // For these errors, just let onend handle the restart
          if (event.error === 'no-speech' || event.error === 'aborted') {
            console.log('[HybridVoice] Will restart via onend');
            return;
          }
          
          // For network errors, try to restart
          if (event.error === 'network') {
            setTimeout(() => {
              if (isActiveRef.current && !isProcessingRef.current) {
                startListening();
              }
            }, 1000);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        console.log('[HybridVoice] Recognition.start() called');

      } catch (err: any) {
        console.error('[HybridVoice] Failed to start recognition:', err);
        isRestartingRef.current = false;
        
        // Retry after delay
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            startListening();
          }
        }, 1000);
      }
    }, delay);
  }, [processUserInput]);

  // START session
  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    console.log('[HybridVoice] Starting... Platform:', PLATFORM);
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Riconoscimento vocale non supportato');
      setError('Browser non supportato');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript([]);
    conversationHistoryRef.current = [];
    pendingTextRef.current = '';
    isProcessingRef.current = false;
    isRestartingRef.current = false;
    lastSpeechTimeRef.current = Date.now();

    // Set active FIRST
    setIsActive(true);
    isActiveRef.current = true;

    // For iOS Safari: minimal setup, start recognition ASAP
    if (PLATFORM.isIOS || PLATFORM.isSafari) {
      console.log('[HybridVoice] iOS/Safari path');
      
      try {
        // Create recognition synchronously in user gesture context
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'it-IT';
        
        recognition.onstart = () => {
          console.log('[HybridVoice] iOS: Recognition started');
          setIsListening(true);
          setIsConnecting(false);
          setAudioLevel(0.3);
        };

        recognition.onaudiostart = () => {
          console.log('[HybridVoice] iOS: Audio started');
        };

        recognition.onspeechstart = () => {
          console.log('[HybridVoice] iOS: Speech detected');
          lastSpeechTimeRef.current = Date.now();
          setAudioLevel(0.6);
        };

        recognition.onresult = (event: any) => {
          console.log('[HybridVoice] iOS: Got result');
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += text;
            } else {
              interimTranscript += text;
            }
          }

          console.log('[HybridVoice] iOS result - interim:', interimTranscript, 'final:', finalTranscript);

          if (interimTranscript) {
            setAudioLevel(0.7);
            pendingTextRef.current = interimTranscript;
            lastSpeechTimeRef.current = Date.now();
            
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            
            silenceTimeoutRef.current = setTimeout(() => {
              if (pendingTextRef.current && !isProcessingRef.current) {
                const text = pendingTextRef.current;
                pendingTextRef.current = '';
                processUserInput(text);
              }
            }, 800);
          }

          if (finalTranscript) {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            pendingTextRef.current = '';
            processUserInput(finalTranscript);
          }
        };

        recognition.onend = () => {
          console.log('[HybridVoice] iOS: Recognition ended');
          setAudioLevel(0);
          
          if (isActiveRef.current && !isProcessingRef.current && !isRestartingRef.current) {
            setTimeout(() => {
              if (isActiveRef.current && !isProcessingRef.current) {
                startListening();
              }
            }, 500);
          }
        };

        recognition.onerror = (event: any) => {
          console.log('[HybridVoice] iOS: Error -', event.error);
          
          if (event.error === 'not-allowed') {
            setError('Abilita il microfono in Impostazioni > Safari');
            toast.error('Permesso microfono negato');
            setIsActive(false);
            isActiveRef.current = false;
            setIsConnecting(false);
            return;
          }
          
          // Let onend handle restart for no-speech/aborted
        };

        recognitionRef.current = recognition;
        recognition.start();
        console.log('[HybridVoice] iOS: Called start()');
        
        // Create session in background
        startSession.mutateAsync('voice').then(session => {
          if (session) sessionIdRef.current = session.id;
        }).catch(() => {});
        
        toast.success('Aria è pronta! Parla pure');
        return;
        
      } catch (err: any) {
        console.error('[HybridVoice] iOS start error:', err);
        setIsConnecting(false);
        setIsActive(false);
        isActiveRef.current = false;
        
        if (err.name === 'NotAllowedError' || err.message?.includes('not-allowed')) {
          setError('Abilita il microfono in Impostazioni > Safari');
          toast.error('Permesso microfono negato');
        } else {
          setError('Errore avvio');
          toast.error('Riprova');
        }
        return;
      }
    }

    // Desktop flow
    try {
      console.log('[HybridVoice] Desktop: Requesting mic permission');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      const session = await startSession.mutateAsync('voice');
      if (session) sessionIdRef.current = session.id;

      setIsConnecting(false);
      startListening();
      
      toast.success('Aria è pronta! Parla pure');

    } catch (err: any) {
      console.error('[HybridVoice] Desktop start error:', err);
      setIsConnecting(false);
      setIsActive(false);
      isActiveRef.current = false;
      
      if (err.name === 'NotAllowedError') {
        setError('Permesso microfono negato');
        toast.error('Abilita il microfono');
      } else {
        setError(err.message || 'Errore di connessione');
        toast.error('Impossibile avviare');
      }
    }
  }, [user, startSession, processUserInput, startListening]);

  // STOP session
  const stop = useCallback(async () => {
    console.log('[HybridVoice] Stopping...');

    // Set flags first to prevent restarts
    setIsActive(false);
    isActiveRef.current = false;
    isRestartingRef.current = false;

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    // Save session
    if (sessionIdRef.current && transcript.length > 0) {
      const sid = sessionIdRef.current;
      const fullTranscript = transcript
        .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
        .join('\n\n');

      endSession.mutateAsync({ sessionId: sid, transcript: fullTranscript })
        .then(() => {
          supabase.functions.invoke('process-session', {
            body: { session_id: sid, user_id: user?.id, transcript: fullTranscript }
          });
        })
        .catch(err => console.error('[HybridVoice] Save error:', err));
    }

    sessionIdRef.current = null;
    pendingTextRef.current = '';
    isProcessingRef.current = false;

    console.log('[HybridVoice] Stopped');
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

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
