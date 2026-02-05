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

// Platform detection - iOS Chrome uses WebKit too!
const detectPlatform = () => {
  if (typeof navigator === 'undefined') return { isIOS: false, isMobile: false };
  const ua = navigator.userAgent;
  // iOS includes iPad, iPhone, iPod - Chrome on iOS also uses WebKit
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return { isIOS, isMobile };
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

  // Refs for state management
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const isProcessingRef = useRef(false);
  const isActiveRef = useRef(false);
  const pendingTextRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastResultTimeRef = useRef<number>(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync ref with state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Cleanup
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    console.log('[Voice] Cleanup');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  // iOS Audio unlock - must be called on user gesture
  const unlockAudioForIOS = useCallback(async (): Promise<boolean> => {
    if (!PLATFORM.isIOS) return true;
    
    console.log('[Voice] Unlocking iOS audio...');
    try {
      // Create and resume AudioContext
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play silent buffer to unlock audio
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      
      // Also create a silent Audio element
      const audio = new Audio();
      audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAbD/tJxjAAAAAAD/+xDEAANIAAYdwAAAeAAA/v8ABAAQBAEA/x//Ff/6gICAg3wfB8H/ygIOfB8HwfKAgIO//5Q58HwfB8oCDnwfD/1AQEHPg+D4PlAQc+D4Pg+UBA=';
      audio.volume = 0.01;
      audio.muted = true;
      
      await audio.play().catch(() => {});
      audio.pause();
      
      console.log('[Voice] iOS audio unlocked');
      return true;
    } catch (e) {
      console.warn('[Voice] iOS audio unlock failed:', e);
      return false;
    }
  }, []);

  // Base64 to Blob conversion
  const base64ToBlob = useCallback((base64: string, mimeType: string): Blob => {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    } catch (e) {
      console.error('[Voice] Base64 decode error:', e);
      return new Blob();
    }
  }, []);

  // Browser TTS fallback
  const playBrowserTTS = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log('[Voice] Using browser TTS');
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
      }, 100);
    });
  }, []);

  // Play ElevenLabs audio with iOS support
  const playAudio = useCallback(async (audioBase64: string | null, mimeType: string, fallbackText: string): Promise<void> => {
    console.log('[Voice] playAudio, hasAudio:', !!audioBase64, 'platform:', PLATFORM);
    setIsSpeaking(true);
    setIsListening(false);

    if (!audioBase64) {
      return playBrowserTTS(fallbackText);
    }

    try {
      // Cleanup previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current = null;
      }

      const audioBlob = base64ToBlob(audioBase64, mimeType || 'audio/mpeg');
      if (audioBlob.size === 0) {
        return playBrowserTTS(fallbackText);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[Voice] Audio blob size:', audioBlob.size);

      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      (audio as any).playsInline = true;
      audio.preload = 'auto';
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onended = () => {
          console.log('[Voice] Audio ended normally');
          done();
        };

        audio.onerror = (e) => {
          console.warn('[Voice] Audio error, falling back to TTS');
          URL.revokeObjectURL(audioUrl);
          playBrowserTTS(fallbackText).then(() => {
            if (!resolved) { resolved = true; resolve(); }
          });
        };

        // Safety timeout
        setTimeout(() => {
          if (!resolved) {
            console.log('[Voice] Audio safety timeout');
            done();
          }
        }, 15000);

        audio.src = audioUrl;
        
        // Load then play
        audio.load();
        
        const attemptPlay = () => {
          const playPromise = audio.play();
          if (playPromise) {
            playPromise
              .then(() => console.log('[Voice] Audio playing'))
              .catch((err) => {
                console.warn('[Voice] Play failed:', err.message);
                URL.revokeObjectURL(audioUrl);
                playBrowserTTS(fallbackText).then(() => {
                  if (!resolved) { resolved = true; resolve(); }
                });
              });
          }
        };

        // On iOS, wait for canplaythrough
        if (PLATFORM.isIOS) {
          audio.oncanplaythrough = attemptPlay;
        } else {
          attemptPlay();
        }
      });
    } catch (err) {
      console.error('[Voice] Audio setup error:', err);
      return playBrowserTTS(fallbackText);
    }
  }, [base64ToBlob, playBrowserTTS]);

  // Process user input - core function
  const processUserInput = useCallback(async (text: string) => {
    const userText = text.trim();
    if (!userText) {
      console.log('[Voice] Empty text, ignoring');
      return;
    }

    if (isProcessingRef.current) {
      console.log('[Voice] Already processing, queuing:', userText);
      pendingTextRef.current = userText;
      return;
    }

    console.log('[Voice] ▶ Processing:', userText);
    isProcessingRef.current = true;
    setIsListening(false);
    pendingTextRef.current = '';

    // Update transcript
    const userEntry: TranscriptEntry = { role: 'user', text: userText, timestamp: new Date() };
    setTranscript(prev => [...prev, userEntry]);
    conversationHistoryRef.current.push({ role: 'user', content: userText });

    try {
      console.log('[Voice] Calling backend...');
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

      const aiText = data?.text || "Non ho capito, puoi ripetere?";
      console.log('[Voice] AI response:', aiText.substring(0, 50));

      // Update transcript
      const aiEntry: TranscriptEntry = { role: 'assistant', text: aiText, timestamp: new Date() };
      setTranscript(prev => [...prev, aiEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: aiText });

      // Play response
      await playAudio(data?.audio || null, data?.mimeType || 'audio/mpeg', aiText);

    } catch (err) {
      console.error('[Voice] Backend error:', err);
      toast.error('Errore nella risposta');
    } finally {
      isProcessingRef.current = false;
      console.log('[Voice] ◀ Processing complete');

      // Restart listening if still active
      if (isActiveRef.current) {
        console.log('[Voice] Restarting recognition...');
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            createAndStartRecognition();
          }
        }, PLATFORM.isIOS ? 800 : 400);
      }
    }
  }, [playAudio]);

  // Create and start speech recognition
  const createAndStartRecognition = useCallback(() => {
    console.log('[Voice] createAndStartRecognition, active:', isActiveRef.current);
    
    if (!isActiveRef.current) {
      console.log('[Voice] Not active, skipping');
      return;
    }

    if (isProcessingRef.current) {
      console.log('[Voice] Processing, will retry later');
      return;
    }

    // Clean up old recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[Voice] SpeechRecognition not available');
      setError('Riconoscimento vocale non supportato');
      return;
    }

    // Create new instance
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // CRITICAL: iOS requires continuous=false
    recognition.continuous = !PLATFORM.isIOS;
    recognition.interimResults = true;
    recognition.lang = 'it-IT';
    recognition.maxAlternatives = 1;

    let accumulatedText = '';
    let lastInterimText = '';

    recognition.onstart = () => {
      console.log('[Voice] 🎤 Listening started');
      setIsListening(true);
      setAudioLevel(0.3);
      accumulatedText = '';
      lastInterimText = '';
      lastResultTimeRef.current = Date.now();
    };

    recognition.onresult = (event: any) => {
      lastResultTimeRef.current = Date.now();
      
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      console.log('[Voice] Result - final:', finalText || '(none)', 'interim:', interimText || '(none)');
      
      // Visual feedback
      if (finalText || interimText) {
        setAudioLevel(0.5 + Math.random() * 0.4);
      }

      // Store interim text for silence detection
      if (interimText) {
        lastInterimText = interimText;
        accumulatedText = interimText;
      }

      // If we got final text, process immediately
      if (finalText && finalText.trim()) {
        console.log('[Voice] ✓ Final result, will process');
        accumulatedText = finalText.trim();
        // Stop recognition, onend will process
        try { recognition.stop(); } catch (e) {}
      }
    };

    recognition.onspeechend = () => {
      console.log('[Voice] Speech ended');
      setAudioLevel(0.2);
    };

    recognition.onend = () => {
      console.log('[Voice] 🎤 Recognition ended, accumulated:', accumulatedText || '(none)', 'processing:', isProcessingRef.current);
      setIsListening(false);
      setAudioLevel(0);

      // Process accumulated text
      const textToProcess = accumulatedText.trim() || lastInterimText.trim();
      if (textToProcess && !isProcessingRef.current && isActiveRef.current) {
        console.log('[Voice] Processing from onend:', textToProcess);
        processUserInput(textToProcess);
        return;
      }

      // Auto-restart if still active and not processing
      if (isActiveRef.current && !isProcessingRef.current) {
        console.log('[Voice] Auto-restart in 600ms');
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            createAndStartRecognition();
          }
        }, 600);
      }
    };

    recognition.onerror = (event: any) => {
      console.log('[Voice] Recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setError('Permesso microfono negato');
        toast.error('Abilita il microfono nelle impostazioni del browser');
        setIsActive(false);
        isActiveRef.current = false;
        return;
      }

      // Handle aborted (usually from stop() call)
      if (event.error === 'aborted') {
        console.log('[Voice] Recognition aborted (expected)');
        return;
      }

      // For other errors, try to restart
      if ((event.error === 'no-speech' || event.error === 'network') && isActiveRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            createAndStartRecognition();
          }
        }, 500);
      }
    };

    // Start recognition
    try {
      recognition.start();
      console.log('[Voice] recognition.start() called');
    } catch (e) {
      console.error('[Voice] Failed to start:', e);
      // Retry once
      setTimeout(() => {
        if (isActiveRef.current && !isProcessingRef.current) {
          createAndStartRecognition();
        }
      }, 1000);
    }
  }, [processUserInput]);

  // iOS silence detection - check periodically if user stopped speaking
  const startSilenceDetection = useCallback(() => {
    if (!PLATFORM.isIOS) return;
    
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    console.log('[Voice] Starting iOS silence detection');
    
    checkIntervalRef.current = setInterval(() => {
      if (!isActiveRef.current || isProcessingRef.current) return;
      
      const timeSinceLastResult = Date.now() - lastResultTimeRef.current;
      
      // If we have pending text and silence for 1.2 seconds, process it
      if (pendingTextRef.current && timeSinceLastResult > 1200) {
        console.log('[Voice] iOS silence detected, processing pending:', pendingTextRef.current);
        const text = pendingTextRef.current;
        pendingTextRef.current = '';
        
        // Stop current recognition
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        
        processUserInput(text);
      }
    }, 500);
  }, [processUserInput]);

  // START - main entry point
  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    console.log('[Voice] ═══ START ═══, iOS:', PLATFORM.isIOS);

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error('Riconoscimento vocale non supportato su questo browser');
      setError('Browser non supportato');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript([]);
    conversationHistoryRef.current = [];
    pendingTextRef.current = '';
    isProcessingRef.current = false;
    lastResultTimeRef.current = Date.now();

    try {
      // Step 1: Request microphone permission explicitly
      console.log('[Voice] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[Voice] Microphone granted');
      
      // Keep the stream tracks for a moment (iOS needs this)
      await new Promise(resolve => setTimeout(resolve, 100));
      stream.getTracks().forEach(track => track.stop());

      // Step 2: Unlock audio for iOS
      if (PLATFORM.isIOS) {
        await unlockAudioForIOS();
      }

      // Step 3: Create session (background on iOS)
      const sessionPromise = startSession.mutateAsync('voice').then(session => {
        if (session) sessionIdRef.current = session.id;
      }).catch(err => console.warn('[Voice] Session error:', err));

      if (!PLATFORM.isIOS) {
        await sessionPromise;
      }

      // Step 4: Activate
      setIsActive(true);
      isActiveRef.current = true;
      setIsConnecting(false);

      // Step 5: Start recognition
      createAndStartRecognition();

      // Step 6: Start iOS silence detection
      if (PLATFORM.isIOS) {
        startSilenceDetection();
      }

      toast.success('Aria è pronta! Parla pure');

    } catch (err: any) {
      console.error('[Voice] Start failed:', err);
      setIsConnecting(false);
      setIsActive(false);
      isActiveRef.current = false;
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        setError('Permesso microfono negato');
        toast.error('Abilita il microfono nelle impostazioni');
      } else {
        toast.error('Impossibile avviare la sessione vocale');
      }
    }
  }, [user, startSession, createAndStartRecognition, unlockAudioForIOS, startSilenceDetection]);

  // STOP
  const stop = useCallback(async () => {
    console.log('[Voice] ═══ STOP ═══');

    setIsActive(false);
    isActiveRef.current = false;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);

    cleanup();

    // End session in background
    if (sessionIdRef.current) {
      const fullTranscript = transcript.map(t => `${t.role}: ${t.text}`).join('\n');
      endSession.mutateAsync({
        sessionId: sessionIdRef.current,
        transcript: fullTranscript
      }).catch(err => console.warn('[Voice] End session error:', err));
      sessionIdRef.current = null;
    }
  }, [cleanup, endSession, transcript]);

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
