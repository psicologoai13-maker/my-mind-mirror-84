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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ElevenLabs TTS - voce naturale di Aria (Carla italiana)
  const playTTS = useCallback(async (text: string): Promise<void> => {
    console.log('[HybridVoice] Playing ElevenLabs TTS for:', text.substring(0, 50) + '...');
    setIsSpeaking(true);
    setIsListening(false);

    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Call ElevenLabs TTS edge function
      const { data, error: ttsError } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text, stream: false }
      });

      if (ttsError) {
        throw new Error(ttsError.message);
      }

      // Handle the audio response
      let audioBlob: Blob;
      
      if (data instanceof Blob) {
        audioBlob = data;
      } else if (data instanceof ArrayBuffer) {
        audioBlob = new Blob([data], { type: 'audio/mpeg' });
      } else {
        throw new Error('Invalid audio response format');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      return new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          console.log('[HybridVoice] ElevenLabs TTS finished');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.error('[HybridVoice] Audio playback error:', e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(e);
        };

        audio.play().catch((playError) => {
          console.error('[HybridVoice] Audio play error:', playError);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(playError);
        });
      });

    } catch (err) {
      console.error('[HybridVoice] ElevenLabs TTS error:', err);
      setIsSpeaking(false);
      
      // Fallback to browser TTS if ElevenLabs fails
      console.log('[HybridVoice] Falling back to browser TTS');
      return new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
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
      // Call our Gemini-powered backend with full Aria personality
      const { data, error: backendError } = await supabase.functions.invoke('aria-agent-backend', {
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

      const assistantText = data?.response || "Scusa, non ho capito. Puoi ripetere?";
      console.log('[HybridVoice] Assistant response:', assistantText);

      // Add assistant response to transcript
      const assistantEntry: TranscriptEntry = { role: 'assistant', text: assistantText, timestamp: new Date() };
      setTranscript(prev => [...prev, assistantEntry]);
      conversationHistoryRef.current.push({ role: 'assistant', content: assistantText });

      // Play TTS with ElevenLabs voice
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
        silenceTimeoutRef.current = setTimeout(() => {
          if (pendingTextRef.current && !isProcessingRef.current) {
            console.log('[HybridVoice] Silence timeout, processing:', pendingTextRef.current);
            const textToProcess = pendingTextRef.current;
            pendingTextRef.current = '';
            recognition.stop();
            processUserInput(textToProcess);
          }
        }, 1200);
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
      
      // Auto-restart if still active and not processing
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
      
      toast.success('Aria è pronta! Inizia a parlare');

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

    // Stop any ongoing audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    // Also stop browser TTS fallback if active
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