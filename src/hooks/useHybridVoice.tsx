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
  const isSafariRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isActiveRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const recognitionInstanceRef = useRef<number>(0); // Track recognition instance for iOS

  // Detect iOS and Safari
  useEffect(() => {
    const ua = navigator.userAgent;
    isIOSRef.current = /iPad|iPhone|iPod/.test(ua);
    isSafariRef.current = /^((?!chrome|android).)*safari/i.test(ua);
    console.log('[HybridVoice] Platform:', { iOS: isIOSRef.current, Safari: isSafariRef.current });
  }, []);

  // Keep isActiveRef in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
 
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
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Unlock audio for iOS Safari - must be called from user gesture
  const unlockAudioForIOS = useCallback(async () => {
    if (audioUnlockedRef.current) return;
    
    console.log('[HybridVoice] Unlocking audio for iOS...');
    try {
      // Create and play a silent audio to unlock audio playback
      const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+9DEAAAIAANIAAAAgAADSAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+9DEKgAADSAAAAAAAAANIAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
      silentAudio.volume = 0.01;
      await silentAudio.play();
      silentAudio.pause();
      audioUnlockedRef.current = true;
      console.log('[HybridVoice] Audio unlocked successfully');
    } catch (e) {
      console.warn('[HybridVoice] Could not unlock audio:', e);
    }
  }, []);

  // Play audio from base64 data or use browser TTS fallback
  const playAudio = useCallback(async (audioBase64: string | null, mimeType: string, fallbackText: string): Promise<void> => {
    console.log('[HybridVoice] Playing audio...');
    setIsSpeaking(true);
    setIsListening(false);

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // If we have audio data, play it
      if (audioBase64) {
        console.log('[HybridVoice] Playing audio, mime:', mimeType);
        const audioUrl = `data:${mimeType || 'audio/mpeg'};base64,${audioBase64}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        // iOS Safari needs explicit settings
        if (isIOSRef.current) {
          audio.setAttribute('playsinline', 'true');
          audio.setAttribute('webkit-playsinline', 'true');
        }

        return new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            console.log('[HybridVoice] Audio playback finished');
            setIsSpeaking(false);
            audioRef.current = null;
            resolve();
          };

          audio.onerror = (e) => {
            console.error('[HybridVoice] Audio playback error:', e);
            setIsSpeaking(false);
            audioRef.current = null;
            reject(e);
          };

          // For iOS, we need to handle the play promise carefully
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((playError) => {
              console.error('[HybridVoice] Audio play error:', playError);
              setIsSpeaking(false);
              audioRef.current = null;
              // On iOS, fall back to TTS if audio fails
              if (isIOSRef.current) {
                console.log('[HybridVoice] iOS audio failed, using TTS');
                const utterance = new SpeechSynthesisUtterance(fallbackText);
                utterance.lang = 'it-IT';
                utterance.rate = 1.0;
                utterance.onend = () => resolve();
                utterance.onerror = () => resolve();
                window.speechSynthesis.speak(utterance);
              } else {
                reject(playError);
              }
            });
          }
        });
      }

      // Fallback to browser TTS
      throw new Error('No audio data, using fallback');
    } catch (err) {
      console.log('[HybridVoice] Using browser TTS fallback');
      setIsSpeaking(false);
      
      return new Promise<void>((resolve) => {
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
        window.speechSynthesis.speak(utterance);
      });
    }
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
      // Call Lovable AI Gateway via Edge Function (no external API keys needed)
      const { data, error: backendError } = await supabase.functions.invoke('aria-voice-chat', {
        body: {
          message: userText,
          conversationHistory: conversationHistoryRef.current.slice(-10).map(m => ({
            role: m.role,
            text: m.content
          }))
        }
      });

      if (backendError) {
        throw new Error(backendError.message);
      }

      const assistantText = data?.text || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[HybridVoice] Assistant response:', assistantText);

      // Add assistant response to transcript
      const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
      setTranscript(prev => [...prev, assistantEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });

      // Play response with ElevenLabs audio (or fallback to browser TTS)
      await playAudio(data?.audio || null, data?.mimeType || 'audio/mpeg', assistantText);

      // Resume listening after speaking
       if (isActiveRef.current && recognitionRef.current) {
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
       if (isActiveRef.current && recognitionRef.current) {
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
   }, [playAudio]);

  const setupSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported');
    }

    recognitionInstanceRef.current += 1;
    const instanceId = recognitionInstanceRef.current;
    console.log('[HybridVoice] Setting up recognition instance:', instanceId);

    const recognition = new SpeechRecognition();
    // iOS Safari: MUST use non-continuous mode and handle restarts manually
    recognition.continuous = !(isIOSRef.current || isSafariRef.current);
    recognition.interimResults = true;
    recognition.lang = 'it-IT';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[HybridVoice] Recognition started (instance:', instanceId, ')');
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
        
          // Process after silence (0.5s for faster response - reduced from 0.8s)
        silenceTimeoutRef.current = setTimeout(() => {
          if (pendingTextRef.current && !isProcessingRef.current) {
            console.log('[HybridVoice] Silence timeout, processing:', pendingTextRef.current);
            const textToProcess = pendingTextRef.current;
            pendingTextRef.current = '';
            intentionalStopRef.current = true;
            recognition.stop();
            processUserInput(textToProcess);
          }
         }, 500);
      }

      if (finalTranscript) {
        console.log('[HybridVoice] Final transcript:', finalTranscript);
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        pendingTextRef.current = '';
        intentionalStopRef.current = true;
        recognition.stop();
        processUserInput(finalTranscript);
      }
    };

    recognition.onspeechend = () => {
      console.log('[HybridVoice] Speech ended');
      setAudioLevel(0.2);
    };

    recognition.onend = () => {
      console.log('[HybridVoice] Recognition ended (instance:', instanceId, ')');
      setAudioLevel(0);
      
      // On iOS/Safari, we need to be more careful with restarts
      const isIOSOrSafari = isIOSRef.current || isSafariRef.current;
      const restartDelay = isIOSOrSafari ? 500 : 300;
      
      // Auto-restart if still active and not processing
      if (isActiveRef.current && !isProcessingRef.current && !isSpeaking) {
        setTimeout(() => {
          // Check if this is still the current instance
          if (instanceId !== recognitionInstanceRef.current) {
            console.log('[HybridVoice] Skipping restart for old instance');
            return;
          }
          
          if (isActiveRef.current && recognitionRef.current && !isProcessingRef.current) {
            try {
              intentionalStopRef.current = false;
              console.log('[HybridVoice] Restarting recognition...');
              recognitionRef.current.start();
            } catch (e) {
              // On iOS Safari, we might need to create a new instance
              if (isIOSOrSafari) {
                console.log('[HybridVoice] iOS/Safari: Creating new recognition instance');
                try {
                  recognitionRef.current = setupSpeechRecognition();
                  recognitionRef.current.start();
                } catch (e2) {
                  console.error('[HybridVoice] Failed to restart recognition:', e2);
                }
              }
            }
          }
        }, restartDelay);
      }
    };

    recognition.onerror = (event) => {
      // Only log non-intentional aborted errors
      if (event.error === 'aborted' && intentionalStopRef.current) {
        intentionalStopRef.current = false;
        return;
      }
      
      // iOS Safari can throw 'not-allowed' if permission was denied
      if (event.error === 'not-allowed') {
        console.error('[HybridVoice] Microphone permission denied');
        setError('Permesso microfono negato. Abilita il microfono nelle impostazioni.');
        return;
      }
      
      if (event.error !== 'aborted') {
        console.error('[HybridVoice] Recognition error:', event.error);
      }
      
      if (event.error === 'no-speech') {
        // Restart listening with longer delay on iOS
        const restartDelay = (isIOSRef.current || isSafariRef.current) ? 400 : 200;
        if (isActiveRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              // On iOS, might need new instance
              if (isIOSRef.current || isSafariRef.current) {
                try {
                  recognitionRef.current = setupSpeechRecognition();
                  recognitionRef.current.start();
                } catch (e2) {
                  console.error('[HybridVoice] Failed to restart after no-speech:', e2);
                }
              }
            }
          }, restartDelay);
        }
      } else if (event.error !== 'aborted') {
        setError(`Errore riconoscimento: ${event.error}`);
      }
    };

    return recognition;
  }, [isSpeaking, processUserInput]);

  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTranscript([]);
    conversationHistoryRef.current = [];

    const isIOSOrSafari = isIOSRef.current || isSafariRef.current;
    console.log('[HybridVoice] Starting on platform:', { iOS: isIOSRef.current, Safari: isSafariRef.current });

    try {
      // On iOS/Safari, unlock audio first (must be in user gesture context)
      if (isIOSOrSafari) {
        console.log('[HybridVoice] Unlocking audio for iOS/Safari...');
        await unlockAudioForIOS();
      }

      // Request microphone permission with timeout for iOS
      console.log('[HybridVoice] Requesting microphone permission...');
      
      const getMicPermission = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      };
      
      // iOS Safari can hang on getUserMedia, add timeout
      const permissionTimeout = isIOSOrSafari ? 10000 : 30000;
      const permissionResult = await Promise.race([
        getMicPermission(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout richiesta microfono')), permissionTimeout)
        )
      ]);
      
      console.log('[HybridVoice] Microphone permission granted');

      // Create session in database with timeout
      console.log('[HybridVoice] Creating session...');
      const sessionPromise = startSession.mutateAsync('voice');
      const session = await Promise.race([
        sessionPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout creazione sessione')), 15000)
        )
      ]);
      
      if (!session) throw new Error('Failed to create session');
      sessionIdRef.current = session.id;
      console.log('[HybridVoice] Session created:', session.id);

      // Setup speech recognition
      console.log('[HybridVoice] Setting up speech recognition...');
      recognitionRef.current = setupSpeechRecognition();
      
      // IMPORTANT: Set states BEFORE starting recognition
      setIsActive(true);
      setIsConnecting(false);
      
      // Start listening with delay on iOS for stability
      const startDelay = isIOSOrSafari ? 200 : 50;
      setTimeout(() => {
        if (!recognitionRef.current) {
          console.error('[HybridVoice] Recognition ref is null');
          return;
        }
        try {
          recognitionRef.current.start();
          console.log('[HybridVoice] Recognition started successfully');
        } catch (e) {
          console.error('[HybridVoice] Failed to start recognition:', e);
          // On iOS, try to recreate the recognition instance
          if (isIOSOrSafari) {
            try {
              console.log('[HybridVoice] Retrying with new instance...');
              recognitionRef.current = setupSpeechRecognition();
              recognitionRef.current?.start();
            } catch (e2) {
              console.error('[HybridVoice] Retry failed:', e2);
            }
          }
        }
      }, startDelay);
      
      toast.success('Aria è pronta! Parla pure');

    } catch (err) {
      console.error('[HybridVoice] Error starting:', err);
      setIsConnecting(false);
      setIsActive(false);
      const errorMessage = err instanceof Error ? err.message : 'Errore di connessione';
      
      // Better error messages for common iOS issues
      if (errorMessage.includes('Permission denied') || errorMessage.includes('not allowed') || errorMessage.includes('NotAllowedError')) {
        setError('Permesso microfono negato. Vai in Impostazioni > Safari > Microfono per abilitarlo.');
        toast.error('Abilita il microfono nelle impostazioni');
      } else if (errorMessage.includes('Timeout')) {
        setError('Connessione lenta. Riprova.');
        toast.error('Timeout - riprova');
      } else {
        setError(errorMessage);
        toast.error('Impossibile avviare la conversazione');
      }
    }
  }, [user, startSession, setupSpeechRecognition, unlockAudioForIOS]);

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

    // Stop any ongoing audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
     // Stop browser TTS if active
    window.speechSynthesis?.cancel();

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