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

// Detect platform at module level (runs once)
const detectPlatformOnce = () => {
  if (typeof navigator === 'undefined') return { isIOS: false, isSafari: false, isIOSSafari: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isIOSSafari = isIOS && /WebKit/i.test(ua) && !/CriOS/i.test(ua);
  return { isIOS, isSafari, isIOSSafari };
};

const PLATFORM = detectPlatformOnce();

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
  const audioContextRef = useRef<AudioContext | null>(null);

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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Convert base64 to Blob - more reliable on iOS Safari than data URIs
  const base64ToBlob = useCallback((base64: string, mimeType: string): Blob => {
    // Use fetch to decode base64 - handles binary correctly
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
        // Cancel any ongoing speech
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
        
        // iOS Safari fix: need a small delay before speaking
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      });
    };

    // If no audio data, use TTS
    if (!audioBase64) {
      console.log('[HybridVoice] No audio data, using TTS');
      return useBrowserTTS();
    }

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      console.log('[HybridVoice] Converting base64 to Blob...');
      
      // Convert base64 to Blob URL - works better on iOS Safari than data URIs
      const audioBlob = base64ToBlob(audioBase64, mimeType || 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('[HybridVoice] Created blob URL, size:', audioBlob.size);
      
      const audio = new Audio();
      
      // iOS Safari needs these attributes
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

        audio.oncanplaythrough = () => {
          console.log('[HybridVoice] Audio ready to play');
        };

        // Set src after event handlers
        audio.src = audioUrl;
        
        // iOS Safari: load() helps trigger canplaythrough
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise) {
          playPromise
            .then(() => {
              console.log('[HybridVoice] Audio playing successfully');
            })
            .catch((err) => {
              console.log('[HybridVoice] Play failed:', err.message, 'using TTS');
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

  const processUserInput = useCallback(async (userText: string) => {
    if (!userText.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    console.log('[HybridVoice] Processing:', userText);

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

      // Resume listening after speaking
      if (isActiveRef.current && recognitionRef.current) {
        setIsListening(true);
        try {
          recognitionRef.current.start();
        } catch (e) {
          // May already be started
        }
      }

    } catch (err) {
      console.error('[HybridVoice] Process error:', err);
      toast.error('Errore nella risposta');
      
      if (isActiveRef.current && recognitionRef.current) {
        setIsListening(true);
        try { recognitionRef.current.start(); } catch (e) {}
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [playAudio]);

  // Create recognition instance - simplified for iOS
  const createRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition non disponibile');
    }

    const recognition = new SpeechRecognition();
    
    // CRITICAL for iOS Safari: continuous MUST be false
    recognition.continuous = !(PLATFORM.isIOS || PLATFORM.isSafari);
    recognition.interimResults = true;
    recognition.lang = 'it-IT';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[HybridVoice] Recognition started');
      setIsListening(true);
      setAudioLevel(0.3);
    };

    recognition.onresult = (event: any) => {
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

      if (interimTranscript) {
        setAudioLevel(0.6 + Math.random() * 0.3);
        pendingTextRef.current = interimTranscript;
        
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        silenceTimeoutRef.current = setTimeout(() => {
          if (pendingTextRef.current && !isProcessingRef.current) {
            const text = pendingTextRef.current;
            pendingTextRef.current = '';
            try { recognition.stop(); } catch (e) {}
            processUserInput(text);
          }
        }, 500);
      }

      if (finalTranscript) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        pendingTextRef.current = '';
        try { recognition.stop(); } catch (e) {}
        processUserInput(finalTranscript);
      }
    };

    recognition.onspeechend = () => {
      console.log('[HybridVoice] Speech ended');
      setAudioLevel(0.2);
    };

    recognition.onend = () => {
      console.log('[HybridVoice] Recognition ended, pending:', pendingTextRef.current?.substring(0, 30));
      setAudioLevel(0);
      setIsListening(false);
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // CRITICAL for iOS: Process any pending text BEFORE restarting
      // iOS Safari stops recognition automatically after speech ends,
      // but the silenceTimeout may not have fired yet
      if (pendingTextRef.current && !isProcessingRef.current && isActiveRef.current) {
        const text = pendingTextRef.current.trim();
        pendingTextRef.current = '';
        
        if (text.length > 0) {
          console.log('[HybridVoice] Processing pending text on end:', text);
          processUserInput(text);
          return; // processUserInput will restart recognition after response
        }
      }
      
      // Auto-restart only if not processing
      if (isActiveRef.current && !isProcessingRef.current) {
        const delay = PLATFORM.isIOS || PLATFORM.isSafari ? 500 : 200;
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            try {
              // On iOS, always create new instance
              if (PLATFORM.isIOS || PLATFORM.isSafari) {
                recognitionRef.current = createRecognition();
              }
              recognitionRef.current?.start();
              setIsListening(true);
            } catch (e) {
              console.log('[HybridVoice] Restart failed:', e);
              try {
                recognitionRef.current = createRecognition();
                recognitionRef.current?.start();
                setIsListening(true);
              } catch (e2) {
                console.error('[HybridVoice] Failed to restart:', e2);
              }
            }
          }
        }, delay);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[HybridVoice] Recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setError('Permesso microfono negato. Abilita il microfono nelle impostazioni di Safari.');
        toast.error('Abilita il microfono nelle impostazioni');
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }
      
      if (event.error === 'no-speech' && isActiveRef.current && !isProcessingRef.current) {
        // Restart on no-speech
        setTimeout(() => {
          try {
            if (PLATFORM.isIOS || PLATFORM.isSafari) {
              recognitionRef.current = createRecognition();
            }
            recognitionRef.current?.start();
          } catch (e) {}
        }, 300);
      }
    };

    return recognition;
  }, [processUserInput]);

  // START - Optimized for iOS Safari
  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    console.log('[HybridVoice] Starting... Platform:', PLATFORM);
    
    // Check API availability
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

    // For iOS Safari: Start recognition IMMEDIATELY in user gesture context
    // Don't do any async work before starting recognition!
    if (PLATFORM.isIOS || PLATFORM.isSafari) {
      console.log('[HybridVoice] iOS/Safari: Starting recognition immediately');
      
      try {
        // Create and start recognition synchronously
        recognitionRef.current = createRecognition();
        recognitionRef.current.start();
        
        // Set active states
        setIsActive(true);
        isActiveRef.current = true;
        setIsConnecting(false);
        
        // Create session in background (don't block the recognition)
        startSession.mutateAsync('voice').then(session => {
          if (session) {
            sessionIdRef.current = session.id;
            console.log('[HybridVoice] Session created:', session.id);
          }
        }).catch(err => {
          console.warn('[HybridVoice] Session creation failed:', err);
        });
        
        toast.success('Aria è pronta! Parla pure');
        return;
        
      } catch (err: any) {
        console.error('[HybridVoice] iOS start failed:', err);
        setIsConnecting(false);
        setIsActive(false);
        
        if (err.message?.includes('not-allowed') || err.name === 'NotAllowedError') {
          setError('Permesso microfono negato. Vai in Impostazioni > Safari > Microfono.');
          toast.error('Abilita il microfono nelle impostazioni');
        } else {
          setError('Errore avvio riconoscimento vocale');
          toast.error('Errore avvio - riprova');
        }
        return;
      }
    }

    // Non-iOS flow (Chrome, Firefox, etc.)
    try {
      // Request microphone permission
      console.log('[HybridVoice] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('[HybridVoice] Permission granted');

      // Create session
      console.log('[HybridVoice] Creating session...');
      const session = await startSession.mutateAsync('voice');
      if (!session) throw new Error('Session creation failed');
      sessionIdRef.current = session.id;
      console.log('[HybridVoice] Session:', session.id);

      // Setup and start recognition
      recognitionRef.current = createRecognition();
      
      setIsActive(true);
      isActiveRef.current = true;
      setIsConnecting(false);
      
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
          console.log('[HybridVoice] Recognition started');
        } catch (e) {
          console.error('[HybridVoice] Start failed:', e);
        }
      }, 100);
      
      toast.success('Aria è pronta! Parla pure');

    } catch (err: any) {
      console.error('[HybridVoice] Start error:', err);
      setIsConnecting(false);
      setIsActive(false);
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        setError('Permesso microfono negato');
        toast.error('Abilita il microfono');
      } else {
        setError(err.message || 'Errore di connessione');
        toast.error('Impossibile avviare');
      }
    }
  }, [user, startSession, createRecognition]);

  const stop = useCallback(async () => {
    console.log('[HybridVoice] Stopping...');

    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Stop recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    // Update state first to prevent restarts
    setIsActive(false);
    isActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    // Save session in background
    if (sessionIdRef.current && transcript.length > 0) {
      const sid = sessionIdRef.current;
      const fullTranscript = transcript
        .map(t => `${t.role === 'user' ? 'Utente' : 'Aria'}: ${t.text}`)
        .join('\n\n');

      // Fire and forget
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

// TypeScript declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
