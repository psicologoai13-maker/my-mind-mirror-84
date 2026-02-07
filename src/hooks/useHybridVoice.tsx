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

  // All refs
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const isProcessingRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTextRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const audioContextUnlockedRef = useRef(false);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Keep ref in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // iOS Safari audio unlock function - MUST be called from user gesture
  const unlockAudioContext = useCallback(() => {
    if (audioContextUnlockedRef.current) return;
    
    console.log('[HybridVoice] Unlocking audio context for iOS...');
    
    // Create and play a silent audio to unlock audio context
    const silentAudio = new Audio();
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
    
    // Tiny silent WAV (44 bytes)
    silentAudio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    
    silentAudio.play().then(() => {
      console.log('[HybridVoice] Audio context unlocked!');
      audioContextUnlockedRef.current = true;
      silentAudio.pause();
    }).catch(err => {
      console.log('[HybridVoice] Audio unlock attempt:', err.message);
    });

    // Also try to create/resume AudioContext
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            console.log('[HybridVoice] AudioContext resumed');
            audioContextUnlockedRef.current = true;
          });
        } else {
          audioContextUnlockedRef.current = true;
        }
      }
    } catch (e) {
      console.log('[HybridVoice] AudioContext not available');
    }

    // Pre-create an audio element that can be reused
    preloadedAudioRef.current = new Audio();
    preloadedAudioRef.current.setAttribute('playsinline', 'true');
    preloadedAudioRef.current.setAttribute('webkit-playsinline', 'true');
    preloadedAudioRef.current.preload = 'auto';
  }, []);
 
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
      if (preloadedAudioRef.current) {
        preloadedAudioRef.current.pause();
        preloadedAudioRef.current = null;
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

  // Browser TTS fallback
  const useBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      console.log('[HybridVoice] Using browser TTS for:', text.substring(0, 30));
      window.speechSynthesis?.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
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
  }, []);

  // Play audio with iOS compatibility - using preloaded element for iOS
  const playAudio = useCallback(async (audioBase64: string | null, mimeType: string, fallbackText: string): Promise<void> => {
    console.log('[HybridVoice] playAudio called, hasAudio:', !!audioBase64, 'iOS:', PLATFORM.isIOS);
    setIsSpeaking(true);
    setIsListening(false);

    if (!audioBase64) {
      return useBrowserTTS(fallbackText);
    }

    try {
      // Clean up any existing audio
      if (audioRef.current && audioRef.current !== preloadedAudioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      const audioBlob = base64ToBlob(audioBase64, mimeType || 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('[HybridVoice] Created blob URL, size:', audioBlob.size);
      
      // For iOS, use the preloaded element if available (it was unlocked with user gesture)
      let audio: HTMLAudioElement;
      if ((PLATFORM.isIOS || PLATFORM.isSafari) && preloadedAudioRef.current) {
        console.log('[HybridVoice] Using preloaded audio element for iOS');
        audio = preloadedAudioRef.current;
        // Reset the element
        audio.pause();
        audio.currentTime = 0;
      } else {
        audio = new Audio();
        audio.setAttribute('playsinline', 'true');
        audio.setAttribute('webkit-playsinline', 'true');
        audio.preload = 'auto';
      }
      
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        let resolved = false;
        const cleanup = () => {
          if (!resolved) {
            resolved = true;
            URL.revokeObjectURL(audioUrl);
            // Don't null out preloaded audio ref
            if (audio !== preloadedAudioRef.current) {
              audioRef.current = null;
            }
          }
        };

        audio.onended = () => {
          console.log('[HybridVoice] Audio playback finished');
          setIsSpeaking(false);
          cleanup();
          resolve();
        };

        audio.onerror = (e) => {
          console.log('[HybridVoice] Audio error:', e, 'falling back to TTS');
          cleanup();
          useBrowserTTS(fallbackText).then(resolve);
        };

        // For iOS, use load() then play() sequence
        audio.src = audioUrl;
        
        if (PLATFORM.isIOS || PLATFORM.isSafari) {
          // iOS needs explicit load
          audio.load();
          
          audio.oncanplaythrough = () => {
            console.log('[HybridVoice] iOS: canplaythrough, attempting play');
            const playPromise = audio.play();
            if (playPromise) {
              playPromise
                .then(() => console.log('[HybridVoice] iOS audio playing successfully'))
                .catch((err) => {
                  console.log('[HybridVoice] iOS play failed:', err.name, err.message);
                  cleanup();
                  useBrowserTTS(fallbackText).then(resolve);
                });
            }
          };
        } else {
          audio.load();
          const playPromise = audio.play();
          if (playPromise) {
            playPromise
              .then(() => console.log('[HybridVoice] Audio playing'))
              .catch((err) => {
                console.log('[HybridVoice] Play failed:', err.message);
                cleanup();
                useBrowserTTS(fallbackText).then(resolve);
              });
          }
        }
      });
    } catch (err) {
      console.log('[HybridVoice] Audio setup failed, using TTS');
      return useBrowserTTS(fallbackText);
    }
  }, [base64ToBlob, useBrowserTTS]);

  // Main function to process user input and get AI response
  // This is NOT a useCallback to avoid circular dependencies
  const doProcessUserInput = async (userText: string): Promise<void> => {
    const trimmedText = userText.trim();
    console.log('[HybridVoice] doProcessUserInput called with:', trimmedText);
    
    if (!trimmedText) {
      console.log('[HybridVoice] Empty text, skipping');
      return;
    }
    
    if (isProcessingRef.current) {
      console.log('[HybridVoice] Already processing, saving for later');
      pendingTextRef.current = trimmedText;
      return;
    }
    
    isProcessingRef.current = true;
    setIsListening(false);
    console.log('[HybridVoice] Processing:', trimmedText);

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      console.log('[HybridVoice] Safety timeout - resetting processing flag');
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

      console.log('[HybridVoice] Backend response received, error:', backendError);
      
      if (backendError) throw new Error(backendError.message);

      const assistantText = data?.text || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[HybridVoice] AI response:', assistantText.substring(0, 50));

      const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
      setTranscript(prev => [...prev, assistantEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });

      console.log('[HybridVoice] Playing audio response...');
      await playAudio(data?.audio || null, data?.mimeType || 'audio/mpeg', assistantText);
      console.log('[HybridVoice] Audio finished');

    } catch (err) {
      console.error('[HybridVoice] Process error:', err);
      toast.error('Errore nella risposta');
    } finally {
      clearTimeout(safetyTimeout);
      isProcessingRef.current = false;
      console.log('[HybridVoice] Processing complete, will restart recognition');
      
      // Restart recognition after processing
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            console.log('[HybridVoice] Restarting recognition...');
            startRecognition();
          }
        }, 500);
      }
    }
  };

  // Start or restart recognition
  const startRecognition = useCallback(() => {
    console.log('[HybridVoice] startRecognition called');
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[HybridVoice] SpeechRecognition not available');
      return;
    }

    // Always create new instance on iOS
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
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

      console.log('[HybridVoice] onresult - interim:', interimTranscript, 'final:', finalTranscript);

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
        const textToProcess = finalTranscript.trim();
        console.log('[HybridVoice] Final transcript, processing:', textToProcess);
        pendingTextRef.current = '';
        try { recognition.stop(); } catch (e) {}
        // Call directly - no ref needed
        doProcessUserInput(textToProcess);
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
            doProcessUserInput(text);
          }
        }, 700); // Longer timeout for iOS
      }
    };

    recognition.onspeechend = () => {
      console.log('[HybridVoice] Speech ended');
      setAudioLevel(0.2);
    };

    recognition.onend = () => {
      const pendingText = pendingTextRef.current?.trim();
      console.log('[HybridVoice] onend - pendingText:', pendingText || '(none)', 'isProcessing:', isProcessingRef.current);
      
      setAudioLevel(0);
      setIsListening(false);
      
      // Clear any pending silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      // CRITICAL: Process any pending text
      if (pendingText && !isProcessingRef.current && isActiveRef.current) {
        console.log('[HybridVoice] Processing pending text from onend:', pendingText);
        pendingTextRef.current = '';
        doProcessUserInput(pendingText);
        return;
      }
      
      // Auto-restart only if not processing and still active
      if (isActiveRef.current && !isProcessingRef.current) {
        console.log('[HybridVoice] Auto-restart in 600ms');
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            startRecognition();
          }
        }, 600);
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
        setTimeout(() => startRecognition(), 300);
      }
    };

    try {
      recognition.start();
      console.log('[HybridVoice] Recognition start() called');
    } catch (e) {
      console.error('[HybridVoice] Failed to start recognition:', e);
    }
  }, [playAudio]);

  // START
  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    console.log('[HybridVoice] === START ===, Platform:', PLATFORM);
    
    // CRITICAL: Unlock audio context immediately on user tap (before any async operations)
    // This is required for iOS Safari to allow audio playback later
    unlockAudioContext();
    
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

    // For iOS Safari: Start recognition IMMEDIATELY
    if (PLATFORM.isIOS || PLATFORM.isSafari) {
      console.log('[HybridVoice] iOS/Safari path - audio unlocked');
      
      try {
        setIsActive(true);
        isActiveRef.current = true;
        setIsConnecting(false);
        
        startRecognition();
        
        // Create session in background
        startSession.mutateAsync('voice').then(session => {
          if (session) sessionIdRef.current = session.id;
        }).catch(err => console.warn('[HybridVoice] Session error:', err));
        
        toast.success('Aria è pronta! Parla pure');
        return;
        
      } catch (err: any) {
        console.error('[HybridVoice] iOS start failed:', err);
        setIsConnecting(false);
        setIsActive(false);
        isActiveRef.current = false;
        toast.error('Errore avvio - riprova');
        return;
      }
    }

    // Non-iOS flow
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      const session = await startSession.mutateAsync('voice');
      if (session) sessionIdRef.current = session.id;

      setIsActive(true);
      isActiveRef.current = true;
      setIsConnecting(false);
      
      startRecognition();
      
      toast.success('Aria è pronta! Parla pure');

    } catch (err: any) {
      console.error('[HybridVoice] Start error:', err);
      setIsConnecting(false);
      setIsActive(false);
      toast.error('Impossibile avviare');
    }
  }, [user, startSession, startRecognition, unlockAudioContext]);

  // STOP
  const stop = useCallback(async () => {
    console.log('[HybridVoice] === STOP ===');

    setIsActive(false);
    isActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

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
