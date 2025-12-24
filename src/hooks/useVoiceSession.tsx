import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type VoiceSessionStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface UseVoiceSessionOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
  onError?: (error: string) => void;
  onLog?: (message: string, isError?: boolean) => void;
}

export const useVoiceSession = (options: UseVoiceSessionOptions = {}) => {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResultRef = useRef<string>('');
  const isStoppedRef = useRef(false);
  
  const log = useCallback((message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString('it-IT');
    console.log(`[${timestamp}] ${message}`);
    options.onLog?.(`[${timestamp}] ${message}`, isError);
  }, [options]);

  const updateStatus = useCallback((newStatus: VoiceSessionStatus) => {
    log(`Status -> ${newStatus}`);
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
  }, [log, options]);

  // Check browser support
  const checkSupport = useCallback((): boolean => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      log('❌ ERRORE: Browser non supporta SpeechRecognition!', true);
      setIsSupported(false);
      setErrorMessage('Browser non supportato. Usa Chrome o Safari.');
      updateStatus('error');
      return false;
    }
    
    if (!window.speechSynthesis) {
      log('❌ ERRORE: Browser non supporta speechSynthesis!', true);
      setIsSupported(false);
      setErrorMessage('Browser non supportato. Usa Chrome o Safari.');
      updateStatus('error');
      return false;
    }
    
    log('✅ Browser supportato');
    return true;
  }, [log, updateStatus]);

  // Find best Italian voice
  const getItalianVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    log(`Voci disponibili: ${voices.length}`);
    
    const googleVoice = voices.find(v => v.lang.startsWith('it') && v.name.toLowerCase().includes('google'));
    if (googleVoice) {
      log(`Voce selezionata: ${googleVoice.name}`);
      return googleVoice;
    }
    
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    if (italianVoice) {
      log(`Voce selezionata: ${italianVoice.name}`);
      return italianVoice;
    }
    
    log('⚠️ Nessuna voce italiana trovata, uso default');
    return null;
  }, [log]);

  // Speak AI response
  const speakResponse = useCallback((text: string) => {
    return new Promise<void>((resolve, reject) => {
      log('🔊 Avvio sintesi vocale...');
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const voice = getItalianVoice();
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.onstart = () => {
        log('🔊 Sintesi vocale iniziata');
      };
      
      utterance.onend = () => {
        log('🔊 Sintesi vocale terminata');
        resolve();
      };
      
      utterance.onerror = (e) => {
        log(`❌ Errore sintesi vocale: ${e.error}`, true);
        reject(e);
      };
      
      speechSynthesis.speak(utterance);
    });
  }, [getItalianVoice, log]);

  // Send text to AI and get response
  const sendToAI = useCallback(async (userText: string) => {
    log('🧠 Invio a Gemini...');
    updateStatus('thinking');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: userText }]
        })
      });
      
      log(`Risposta HTTP: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        log(`❌ Errore API: ${response.status} - ${errorText}`, true);
        throw new Error(`Errore API: ${response.status}`);
      }
      
      // Parse streaming response
      let aiResponse = '';
      const reader = response.body?.getReader();
      
      if (reader) {
        log('📥 Lettura stream risposta...');
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) aiResponse += content;
              } catch {}
            }
          }
        }
      }
      
      log(`✅ Risposta Gemini: "${aiResponse.substring(0, 50)}..."`);
      return aiResponse.trim();
    } catch (error) {
      log(`❌ Errore chiamata AI: ${error}`, true);
      throw error;
    }
  }, [log, updateStatus]);

  // Start listening
  const startListening = useCallback(() => {
    if (isStoppedRef.current) {
      log('⏹️ Sessione fermata, non avvio ascolto');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      log('❌ SpeechRecognition non disponibile!', true);
      setErrorMessage('Browser non supportato');
      updateStatus('error');
      return;
    }
    
    // Clean up previous instance
    if (recognitionRef.current) {
      log('🧹 Pulizia istanza precedente...');
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    
    log('🎤 Creazione SpeechRecognition...');
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'it-IT';
    
    recognitionRef.current.onstart = () => {
      log('🎤 Microfono ATTIVO - Parla ora!');
      updateStatus('listening');
      setLiveTranscript('');
      lastResultRef.current = '';
    };
    
    recognitionRef.current.onresult = (event: any) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
      let interimText = '';
      let finalText = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      
      const displayText = finalText || interimText;
      if (displayText) {
        setLiveTranscript(displayText);
        lastResultRef.current = displayText;
        log(`📝 Rilevato: "${displayText}"`);
      }
      
      // 1.5 second silence detection
      silenceTimeoutRef.current = setTimeout(async () => {
        const textToSend = lastResultRef.current.trim();
        if (!textToSend || isStoppedRef.current) return;
        
        log(`📤 Testo finale: "${textToSend}"`);
        
        try {
          recognitionRef.current?.stop();
        } catch {}
        
        setLiveTranscript('');
        setTranscript(prev => [...prev, `Tu: ${textToSend}`]);
        options.onTranscript?.(textToSend, true);
        
        try {
          const aiResponse = await sendToAI(textToSend);
          
          if (aiResponse && !isStoppedRef.current) {
            setTranscript(prev => [...prev, `AI: ${aiResponse}`]);
            options.onTranscript?.(aiResponse, false);
            
            updateStatus('speaking');
            await speakResponse(aiResponse);
          }
          
          if (!isStoppedRef.current) {
            log('🔄 Riavvio ascolto...');
            startListening();
          }
          
        } catch (error) {
          log(`❌ Errore conversazione: ${error}`, true);
          toast.error('Errore nella risposta');
          
          if (!isStoppedRef.current) {
            startListening();
          }
        }
      }, 1500);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      log(`❌ Errore riconoscimento: ${event.error}`, true);
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Permesso microfono negato. Consenti l\'accesso.');
        updateStatus('error');
        return;
      }
      
      if (event.error === 'no-speech') {
        log('⚠️ Nessun discorso rilevato, continuo...');
      }
      
      // Auto-restart on other errors
      if (!isStoppedRef.current && event.error !== 'aborted') {
        setTimeout(() => {
          if (!isStoppedRef.current) {
            log('🔄 Tentativo riavvio dopo errore...');
            startListening();
          }
        }, 500);
      }
    };
    
    recognitionRef.current.onend = () => {
      log('🎤 Recognition terminato');
    };
    
    try {
      log('🎤 Avvio recognition.start()...');
      recognitionRef.current.start();
    } catch (e) {
      log(`❌ Errore start(): ${e}`, true);
    }
  }, [log, options, sendToAI, speakResponse, updateStatus]);

  // Start session
  const start = useCallback(async () => {
    log('=== AVVIO SESSIONE ===');
    isStoppedRef.current = false;
    setTranscript([]);
    setErrorMessage(null);
    setLiveTranscript('');
    
    // Check browser support first
    if (!checkSupport()) {
      return;
    }
    
    // Force reset audio
    log('🔇 Reset speechSynthesis...');
    speechSynthesis.cancel();
    
    // Preload voices
    log('📢 Caricamento voci...');
    const voices = speechSynthesis.getVoices();
    log(`Voci caricate: ${voices.length}`);
    
    // If no voices, wait for them
    if (voices.length === 0) {
      log('⏳ Attendo caricamento voci...');
      await new Promise<void>((resolve) => {
        speechSynthesis.onvoiceschanged = () => {
          log(`Voci ora disponibili: ${speechSynthesis.getVoices().length}`);
          resolve();
        };
        // Timeout after 2 seconds
        setTimeout(resolve, 2000);
      });
    }
    
    // Request microphone permission
    log('🎤 Richiesta permesso microfono...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('✅ Permesso microfono concesso');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      log(`❌ Permesso microfono NEGATO: ${error}`, true);
      setErrorMessage('Permesso microfono negato');
      updateStatus('error');
      return;
    }
    
    log('🚀 Avvio ascolto...');
    toast.success('Conversazione avviata!');
    startListening();
  }, [checkSupport, log, startListening, updateStatus]);

  // Stop session
  const stop = useCallback(() => {
    log('=== STOP SESSIONE ===');
    isStoppedRef.current = true;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    
    speechSynthesis.cancel();
    
    setLiveTranscript('');
    updateStatus('idle');
  }, [log, updateStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      log(newMuted ? '🔇 Mute attivato' : '🔊 Mute disattivato');
      
      if (newMuted) {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      } else {
        if (status !== 'speaking' && status !== 'thinking') {
          startListening();
        }
      }
      
      return newMuted;
    });
  }, [log, startListening, status]);

  return {
    status,
    isMuted,
    transcript,
    errorMessage,
    liveTranscript,
    isSupported,
    start,
    stop,
    toggleMute
  };
};
