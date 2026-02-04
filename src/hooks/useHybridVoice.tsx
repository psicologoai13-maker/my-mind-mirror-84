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
  const isActiveRef = useRef(false); // Track active state for callbacks

  // Keep isActiveRef in sync with isActive state
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

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

  // Convert base64 to Blob for better browser compatibility
  const base64ToBlob = useCallback((base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }, []);

  // Play audio from base64
  const playAudio = useCallback(async (base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        console.log('[HybridVoice] Creating audio from base64, length:', base64Audio.length);
        
        // Use Blob instead of data URI for better compatibility
        const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          console.log('[HybridVoice] Audio playback ended');
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          resolve();
        };
        
        audio.onerror = (e) => {
          console.error('[HybridVoice] Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          setIsSpeaking(false);
          reject(e);
        };

        audio.oncanplaythrough = () => {
          console.log('[HybridVoice] Audio ready to play');
        };

        currentAudioRef.current = audio;
        setIsSpeaking(true);
        
        // Handle play() promise rejection
        audio.play()
          .then(() => {
            console.log('[HybridVoice] Audio playback started');
          })
          .catch((playError) => {
            console.error('[HybridVoice] Play failed:', playError);
            URL.revokeObjectURL(audioUrl);
            setIsSpeaking(false);
            reject(playError);
          });
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
      if (recognitionRef.current && isActiveRef.current) {
        console.log('[HybridVoice] Resuming listening after speech');
        setIsListening(true);
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('[HybridVoice] Recognition already started or error:', e);
        }
      }
    } catch (error) {
      console.error('[HybridVoice] Error processing input:', error);
      toast.error('Errore nella risposta di Aria');
      
      // Resume listening on error
      if (recognitionRef.current && isActiveRef.current) {
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
  }, [realTimeContext, playAudio]);

  // Initialize Web Speech API
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Il tuo browser non supporta il riconoscimento vocale');
      return null;
    }

    // Detect iOS for special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    console.log('[HybridVoice] Platform:', { isIOS, userAgent: navigator.userAgent });

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    // iOS Safari doesn't handle continuous mode well
    recognition.continuous = !isIOS;
    recognition.interimResults = true;

    let finalTranscript = '';
    let interimTranscript = '';
    let silenceTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let restartTimeoutId: ReturnType<typeof setTimeout> | null = null;

    // Process interim transcript after silence
    const processAfterSilence = () => {
      const textToProcess = interimTranscript.trim() || finalTranscript.trim();
      if (textToProcess && !isProcessingRef.current) {
        console.log('[HybridVoice] Processing after silence:', textToProcess);
        interimTranscript = '';
        finalTranscript = '';
        setCurrentTranscript('');
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
        processUserInput(textToProcess);
      }
    };

    recognition.onresult = (event) => {
      console.log('[HybridVoice] onresult event received, results:', event.results.length);
      
      // Clear previous timeouts
      if (silenceTimeoutId) {
        clearTimeout(silenceTimeoutId);
        silenceTimeoutId = null;
      }

      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        console.log('[HybridVoice] Result:', { 
          index: i, 
          isFinal: result.isFinal, 
          transcript: result[0].transcript,
          confidence: result[0].confidence 
        });
        
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      interimTranscript = interim;
      const displayText = interim || finalTranscript;
      setCurrentTranscript(displayText);
      console.log('[HybridVoice] Transcript update:', { interim, final: finalTranscript, display: displayText });

      // Process immediately if we have a final result
      if (finalTranscript.trim()) {
        const toProcess = finalTranscript.trim();
        console.log('[HybridVoice] Processing final transcript:', toProcess);
        finalTranscript = '';
        interimTranscript = '';
        setCurrentTranscript('');
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
        processUserInput(toProcess);
      } else if (interim.trim()) {
        // Set timeout to process interim transcript after silence
        // Shorter timeout on iOS since it doesn't give final results reliably
        const silenceDelay = isIOS ? 1200 : 1500;
        silenceTimeoutId = setTimeout(processAfterSilence, silenceDelay);
      }
    };

    recognition.onend = () => {
      console.log('[HybridVoice] Recognition ended, isProcessing:', isProcessingRef.current, 'isActive:', isActiveRef.current);
      
      // On iOS, check if we have pending interim transcript to process
      if (isIOS && interimTranscript.trim() && !isProcessingRef.current) {
        console.log('[HybridVoice] iOS: Processing pending interim on end:', interimTranscript);
        processAfterSilence();
        return;
      }
      
      // Auto-restart if we're not processing and session is active
      if (!isProcessingRef.current && isActiveRef.current) {
        // Small delay before restart to avoid rapid cycling
        restartTimeoutId = setTimeout(() => {
          if (isActiveRef.current && !isProcessingRef.current) {
            try {
              console.log('[HybridVoice] Restarting recognition...');
              recognition.start();
            } catch (e) {
              console.log('[HybridVoice] Restart error:', e);
            }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[HybridVoice] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Permesso microfono negato');
      }
    };

    return recognition;
  }, [processUserInput]);

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
                  if (recognitionRef.current && isActiveRef.current) {
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
  }, [user, startSession, initSpeechRecognition, updateAudioLevel, realTimeContext, playAudio]);

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
