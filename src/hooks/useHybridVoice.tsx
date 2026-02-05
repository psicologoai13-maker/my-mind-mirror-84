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
const detectPlatformOnce = () => {
  if (typeof navigator === 'undefined') return { isIOS: false, isSafari: false };
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return { isIOS, isSafari };
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
  
  // Ref to hold process function for circular dependency
  const processUserInputRef = useRef<(text: string) => Promise<void>>();

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

  // Create new recognition instance
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

      console.log('[HybridVoice] Result - interim:', interimTranscript, 'final:', finalTranscript);

      // Store any text we receive
      if (interimTranscript || finalTranscript) {
        setAudioLevel(0.6 + Math.random() * 0.3);
        pendingTextRef.current = finalTranscript || interimTranscript;
      }

      // Clear existing timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // If we got final transcript, process immediately
      if (finalTranscript && finalTranscript.trim()) {
        console.log('[HybridVoice] Got final transcript, processing:', finalTranscript);
        pendingTextRef.current = '';
        try { recognition.stop(); } catch (e) {}
        processUserInputRef.current?.(finalTranscript.trim());
        return;
      }

      // For interim results, set up silence detection
      if (interimTranscript) {
        silenceTimeoutRef.current = setTimeout(() => {
          const text = pendingTextRef.current?.trim();
          if (text && !isProcessingRef.current) {
            console.log('[HybridVoice] Silence timeout, processing:', text);
            pendingTextRef.current = '';
            try { recognition.stop(); } catch (e) {}
            processUserInputRef.current?.(text);
          }
        }, 600); // Slightly longer timeout for iOS
      }
    };

    recognition.onspeechend = () => {
      console.log('[HybridVoice] Speech ended');
      setAudioLevel(0.2);
    };

    recognition.onend = () => {
      console.log('[HybridVoice] Recognition ended, pendingText:', pendingTextRef.current?.substring(0, 30) || '(empty)');
      setAudioLevel(0);
      setIsListening(false);
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // CRITICAL for iOS: Process any pending text BEFORE restarting
      const pendingText = pendingTextRef.current?.trim();
      if (pendingText && !isProcessingRef.current && isActiveRef.current) {
        console.log('[HybridVoice] Processing pending text on end:', pendingText);
        pendingTextRef.current = '';
        processUserInputRef.current?.(pendingText);
        return; // processUserInput will restart recognition
      }
      
      // Auto-restart only if not processing and still active
      if (isActiveRef.current && !isProcessingRef.current) {
        const delay = PLATFORM.isIOS || PLATFORM.isSafari ? 500 : 200;
        console.log('[HybridVoice] Scheduling restart in', delay, 'ms');
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            try {
              // On iOS, MUST create new instance
              if (PLATFORM.isIOS || PLATFORM.isSafari) {
                recognitionRef.current = createRecognition();
              }
              recognitionRef.current?.start();
            } catch (e) {
              console.log('[HybridVoice] Restart failed, creating new instance');
              try {
                recognitionRef.current = createRecognition();
                recognitionRef.current?.start();
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
        setError('Permesso microfono negato');
        toast.error('Abilita il microfono nelle impostazioni');
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }
      
      // On no-speech, just restart
      if (event.error === 'no-speech' && isActiveRef.current && !isProcessingRef.current) {
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
  }, []);

  // Process user input - defined after createRecognition
  const processUserInput = useCallback(async (userText: string) => {
    const trimmedText = userText.trim();
    if (!trimmedText) {
      console.log('[HybridVoice] Empty text, skipping');
      return;
    }
    
    if (isProcessingRef.current) {
      console.log('[HybridVoice] Already processing, saving for later:', trimmedText);
      pendingTextRef.current = trimmedText;
      return;
    }
    
    isProcessingRef.current = true;
    setIsListening(false);
    console.log('[HybridVoice] Processing:', trimmedText);

    // Safety timeout - reset processing flag after 30s max
    const safetyTimeout = setTimeout(() => {
      console.log('[HybridVoice] Safety timeout triggered');
      isProcessingRef.current = false;
    }, 30000);

    const userEntry: TranscriptEntry = { role: 'user', text: trimmedText, timestamp: new Date() };
    setTranscript(prev => [...prev, userEntry]);
    conversationHistoryRef.current.push({ role: 'user', content: trimmedText });

    try {
      console.log('[HybridVoice] Calling aria-voice-chat...');
      const { data, error: backendError } = await supabase.functions.invoke('aria-voice-chat', {
        body: {
          message: trimmedText,
          conversationHistory: conversationHistoryRef.current.slice(-10).map(m => ({
            role: m.role,
            text: m.content
          }))
        }
      });

      if (backendError) throw new Error(backendError.message);

      const assistantText = data?.text || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[HybridVoice] Got response:', assistantText.substring(0, 50));

      const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
      setTranscript(prev => [...prev, assistantEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });

      await playAudio(data?.audio || null, data?.mimeType || 'audio/mpeg', assistantText);

      console.log('[HybridVoice] Audio finished, will restart recognition');

    } catch (err) {
      console.error('[HybridVoice] Process error:', err);
      toast.error('Errore nella risposta');
    } finally {
      clearTimeout(safetyTimeout);
      isProcessingRef.current = false;
      console.log('[HybridVoice] Processing complete, isActive:', isActiveRef.current);
      
      // Restart recognition after processing
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            try {
              console.log('[HybridVoice] Restarting recognition after response');
              // On iOS, ALWAYS create new instance
              recognitionRef.current = createRecognition();
              recognitionRef.current?.start();
            } catch (e) {
              console.error('[HybridVoice] Failed to restart after response:', e);
            }
          }
        }, 400);
      }
    }
  }, [playAudio, createRecognition]);

  // Store processUserInput in ref for circular dependency
  useEffect(() => {
    processUserInputRef.current = processUserInput;
  }, [processUserInput]);

  // START - Optimized for iOS Safari
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

    // For iOS Safari: Start recognition IMMEDIATELY in user gesture context
    if (PLATFORM.isIOS || PLATFORM.isSafari) {
      console.log('[HybridVoice] iOS/Safari: Starting recognition immediately');
      
      try {
        recognitionRef.current = createRecognition();
        recognitionRef.current.start();
        
        setIsActive(true);
        isActiveRef.current = true;
        setIsConnecting(false);
        
        // Create session in background
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
          setError('Permesso microfono negato');
          toast.error('Abilita il microfono nelle impostazioni');
        } else {
          setError('Errore avvio');
          toast.error('Errore avvio - riprova');
        }
        return;
      }
    }

    // Non-iOS flow
    try {
      console.log('[HybridVoice] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      const session = await startSession.mutateAsync('voice');
      if (!session) throw new Error('Session creation failed');
      sessionIdRef.current = session.id;

      recognitionRef.current = createRecognition();
      
      setIsActive(true);
      isActiveRef.current = true;
      setIsConnecting(false);
      
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          console.error('[HybridVoice] Start failed:', e);
        }
      }, 100);
      
      toast.success('Aria è pronta! Parla pure');

    } catch (err: any) {
      console.error('[HybridVoice] Start error:', err);
      setIsConnecting(false);
      setIsActive(false);
      
      if (err.name === 'NotAllowedError') {
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

    // Update state first to prevent restarts
    setIsActive(false);
    isActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

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

    // Save session in background
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

// TypeScript declarations
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
