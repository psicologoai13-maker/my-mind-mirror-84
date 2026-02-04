import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSessions } from './useSessions';
import { useRealTimeContext } from './useRealTimeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseHybridVoiceReturn {
  isActive: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  audioLevel: number;
  currentTranscript: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export const useHybridVoice = (): UseHybridVoiceReturn => {
  const { user } = useAuth();
  const { startSession, endSession } = useSessions();
  const { context: realTimeContext } = useRealTimeContext();

  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);
  const isProcessingRef = useRef(false);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && isListening) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setAudioLevel(average / 255);
    }
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isListening]);

  // Play audio from base64
  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeaking(false);
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('[HybridVoice] Audio playback error:', e);
          setIsSpeaking(false);
          reject(e);
        };

        currentAudioRef.current = audio;
        setIsSpeaking(true);
        audio.play();
      } catch (error) {
        console.error('[HybridVoice] Error creating audio:', error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  }, []);

  // Get Aria's response and speak it
  const processUserInput = useCallback(async (transcript: string) => {
    if (!transcript.trim() || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsListening(false);

    try {
      console.log('[HybridVoice] Processing:', transcript);

      // Add user message to history
      conversationHistoryRef.current.push({
        role: 'user',
        content: transcript,
      });

      // Get Aria's response from Gemini
      const { data: session } = await supabase.auth.getSession();
      
      const chatResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hybrid-voice-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.session?.access_token 
              ? `Bearer ${session.session.access_token}`
              : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userMessage: transcript,
            realTimeContext,
            conversationHistory: conversationHistoryRef.current.slice(-10),
          }),
        }
      );

      if (!chatResponse.ok) {
        throw new Error(`Chat API error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      const ariaText = chatData.response;

      if (!ariaText) {
        throw new Error('No response from Aria');
      }

      console.log('[HybridVoice] Aria says:', ariaText);

      // Add assistant message to history
      conversationHistoryRef.current.push({
        role: 'assistant',
        content: ariaText,
      });

      // Convert to speech with ElevenLabs
      const ttsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: ariaText }),
        }
      );

      if (!ttsResponse.ok) {
        throw new Error(`TTS API error: ${ttsResponse.status}`);
      }

      const ttsData = await ttsResponse.json();
      
      if (ttsData.audioContent) {
        await playAudio(ttsData.audioContent);
      }

      // Resume listening after speaking
      if (recognitionRef.current && isActive) {
        setIsListening(true);
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
    } catch (error) {
      console.error('[HybridVoice] Error processing input:', error);
      toast.error('Errore nella risposta di Aria');
      
      // Resume listening on error
      if (recognitionRef.current && isActive) {
        setIsListening(true);
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [realTimeContext, playAudio, isActive]);

  // Initialize Web Speech API
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Il tuo browser non supporta il riconoscimento vocale');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      setCurrentTranscript(interim || finalTranscript);

      // Process when we have a final result
      if (finalTranscript.trim()) {
        const toProcess = finalTranscript.trim();
        finalTranscript = '';
        setCurrentTranscript('');
        
        // Stop recognition while processing
        recognition.stop();
        processUserInput(toProcess);
      }
    };

    recognition.onend = () => {
      console.log('[HybridVoice] Recognition ended');
      // Don't auto-restart if we're processing or not active
      if (!isProcessingRef.current && isActive && isListening) {
        try {
          recognition.start();
        } catch (e) {
          // Already started or error
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('[HybridVoice] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permesso microfono negato');
      }
    };

    return recognition;
  }, [processUserInput, isActive, isListening]);

  // Start hybrid voice session
  const start = useCallback(async () => {
    if (!user) {
      toast.error('Devi essere autenticato');
      return;
    }

    setIsConnecting(true);
    console.log('[HybridVoice] Starting hybrid voice session...');

    try {
      // Create session in database
      const session = await startSession.mutateAsync('voice');
      if (!session) throw new Error('Failed to create session');
      sessionIdRef.current = session.id;

      // Reset conversation history
      conversationHistoryRef.current = [];

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up audio analyzer for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Initialize speech recognition
      recognitionRef.current = initSpeechRecognition();
      if (!recognitionRef.current) {
        throw new Error('Speech recognition not available');
      }

      // Start listening
      setIsActive(true);
      setIsConnecting(false);
      setIsListening(true);
      updateAudioLevel();

      recognitionRef.current.start();
      toast.success('Connesso! Inizia a parlare');

      // Play initial greeting
      setTimeout(async () => {
        try {
          const { data: authSession } = await supabase.auth.getSession();
          
          const chatResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hybrid-voice-chat`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authSession?.session?.access_token 
                  ? `Bearer ${authSession.session.access_token}`
                  : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                userMessage: 'Ciao Aria, sono qui.',
                realTimeContext,
                conversationHistory: [],
              }),
            }
          );

          if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            if (chatData.response) {
              conversationHistoryRef.current.push({
                role: 'assistant',
                content: chatData.response,
              });

              const ttsResponse = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  },
                  body: JSON.stringify({ text: chatData.response }),
                }
              );

              if (ttsResponse.ok) {
                const ttsData = await ttsResponse.json();
                if (ttsData.audioContent) {
                  recognitionRef.current?.stop();
                  await playAudio(ttsData.audioContent);
                  if (recognitionRef.current && isActive) {
                    setIsListening(true);
                    recognitionRef.current.start();
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('[HybridVoice] Error with greeting:', e);
        }
      }, 500);

    } catch (error) {
      console.error('[HybridVoice] Error starting:', error);
      setIsConnecting(false);
      setIsActive(false);
      toast.error(error instanceof Error ? error.message : 'Errore di connessione');

      // Cleanup on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [user, startSession, initSpeechRecognition, updateAudioLevel, realTimeContext, playAudio, isActive]);

  // Stop hybrid voice session
  const stop = useCallback(async () => {
    console.log('[HybridVoice] Stopping session...');

    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Save session transcript
    if (sessionIdRef.current && conversationHistoryRef.current.length > 0) {
      const transcript = conversationHistoryRef.current
        .map(msg => `${msg.role === 'user' ? 'Utente' : 'Aria'}: ${msg.content}`)
        .join('\n\n');

      // Process session
      try {
        await supabase.functions.invoke('process-session', {
          body: {
            session_id: sessionIdRef.current,
            user_id: user?.id,
            transcript,
          },
        });
      } catch (e) {
        console.error('[HybridVoice] Error processing session:', e);
      }

      // End session
      await endSession.mutateAsync({
        sessionId: sessionIdRef.current,
        transcript,
      });
    }

    // Reset state
    setIsActive(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setIsListening(false);
    setAudioLevel(0);
    setCurrentTranscript('');
    conversationHistoryRef.current = [];
    sessionIdRef.current = null;

    console.log('[HybridVoice] Session stopped');
  }, [endSession, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    audioLevel,
    currentTranscript,
    start,
    stop,
  };
};

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
