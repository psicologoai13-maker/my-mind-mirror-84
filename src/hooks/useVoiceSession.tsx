import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type VoiceSessionStatus = 'idle' | 'listening' | 'thinking' | 'ready_to_speak' | 'speaking' | 'error';

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
  const [pendingResponse, setPendingResponse] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResultRef = useRef<string>('');
  const isStoppedRef = useRef(false);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // AGNOSTIC VOICE SELECTION
  const getItalianVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    log(`Voci disponibili: ${voices.length}`);
    
    const voice = voices.find(v => v.lang.includes('it-IT')) || 
                  voices.find(v => v.lang.includes('it')) || 
                  voices[0] || null;
    
    if (voice) {
      log(`✅ Voce selezionata: ${voice.name} (${voice.lang})`);
    }
    
    return voice;
  }, [log]);

  // MANUAL PLAYBACK - User must tap to hear
  const playPendingResponse = useCallback(() => {
    if (!pendingResponse) {
      log('⚠️ Nessuna risposta da riprodurre');
      return;
    }
    
    log('🔊 Utente ha premuto ASCOLTA');
    log(`📝 Testo: "${pendingResponse.substring(0, 50)}..."`);
    
    // Reset aggressivo
    window.speechSynthesis.cancel();
    
    updateStatus('speaking');
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(pendingResponse);
      utterance.lang = 'it-IT';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      const voice = getItalianVoice();
      if (voice) {
        utterance.voice = voice;
      }
      
      // Memory leak fix
      (window as any).currentUtterance = utterance;
      
      // Clear previous watchdog
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
      
      utterance.onstart = () => {
        log('🔊 Audio INIZIATO');
        
        // Watchdog 15 secondi
        watchdogRef.current = setTimeout(() => {
          log('⏰ WATCHDOG: forzo interruzione', true);
          window.speechSynthesis.cancel();
          setPendingResponse(null);
          if (!isStoppedRef.current) {
            startListening();
          }
        }, 15000);
      };
      
      utterance.onend = () => {
        log('🔊 Audio TERMINATO');
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
        (window as any).currentUtterance = null;
        setPendingResponse(null);
        
        // Auto-reopen mic after speech ends
        if (!isStoppedRef.current) {
          log('🔄 Riapro microfono automaticamente...');
          setTimeout(() => startListening(), 300);
        }
      };
      
      utterance.onerror = (e) => {
        log(`❌ Errore audio: ${e.error}`, true);
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
        (window as any).currentUtterance = null;
        setPendingResponse(null);
        
        if (!isStoppedRef.current) {
          startListening();
        }
      };
      
      log('🔊 Chiamata speak()...');
      speechSynthesis.speak(utterance);
      
      // Chrome resume workaround
      setTimeout(() => {
        if (speechSynthesis.paused) {
          log('⚠️ Forzo resume...');
          speechSynthesis.resume();
        }
      }, 100);
      
    }, 50);
  }, [pendingResponse, getItalianVoice, log, updateStatus]);

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
        log('📥 Lettura stream...');
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
      
      log(`✅ Risposta: "${aiResponse.substring(0, 50)}..."`);
      return aiResponse.trim();
    } catch (error) {
      log(`❌ Errore AI: ${error}`, true);
      throw error;
    }
  }, [log, updateStatus]);

  // Start listening
  const startListening = useCallback(() => {
    if (isStoppedRef.current) {
      log('⏹️ Sessione fermata');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      log('❌ SpeechRecognition non disponibile!', true);
      setErrorMessage('Browser non supportato');
      updateStatus('error');
      return;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    
    log('🎤 Avvio ascolto...');
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'it-IT';
    
    recognitionRef.current.onstart = () => {
      log('🎤 Microfono ATTIVO');
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
        log(`📝 "${displayText}"`);
      }
      
      // 1.5s silence -> send
      silenceTimeoutRef.current = setTimeout(async () => {
        const textToSend = lastResultRef.current.trim();
        if (!textToSend || isStoppedRef.current) return;
        
        log(`📤 Invio: "${textToSend}"`);
        
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
            
            // Store response and show "Listen" button
            log('📱 Risposta pronta - mostra pulsante ASCOLTA');
            setPendingResponse(aiResponse);
            updateStatus('ready_to_speak');
          }
          
        } catch (error) {
          log(`❌ Errore: ${error}`, true);
          toast.error('Errore nella risposta');
          
          if (!isStoppedRef.current) {
            startListening();
          }
        }
      }, 1500);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      log(`❌ Errore mic: ${event.error}`, true);
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Permesso microfono negato');
        updateStatus('error');
        return;
      }
      
      if (!isStoppedRef.current && event.error !== 'aborted') {
        setTimeout(() => {
          if (!isStoppedRef.current) {
            startListening();
          }
        }, 500);
      }
    };
    
    recognitionRef.current.onend = () => {
      log('🎤 Recognition terminato');
    };
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      log(`❌ Errore start: ${e}`, true);
    }
  }, [log, options, sendToAI, updateStatus]);

  // Start session
  const start = useCallback(async () => {
    log('=== AVVIO SESSIONE ===');
    isStoppedRef.current = false;
    setTranscript([]);
    setErrorMessage(null);
    setLiveTranscript('');
    setPendingResponse(null);
    
    if (!checkSupport()) return;
    
    // Audio unlock
    log('🔓 Audio unlock...');
    const synth = window.speechSynthesis;
    synth.cancel();
    const unlockUtterance = new SpeechSynthesisUtterance('');
    synth.speak(unlockUtterance);
    synth.resume();
    
    // Preload voices
    log('📢 Caricamento voci...');
    let voices = speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      await new Promise<void>((resolve) => {
        const checkVoices = () => {
          if (speechSynthesis.getVoices().length > 0) resolve();
        };
        speechSynthesis.onvoiceschanged = checkVoices;
        setTimeout(resolve, 2000);
      });
    }
    
    // Request mic permission
    log('🎤 Richiesta permesso microfono...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('✅ Permesso OK');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      log(`❌ Permesso NEGATO: ${error}`, true);
      setErrorMessage('Permesso microfono negato');
      updateStatus('error');
      return;
    }
    
    toast.success('Conversazione avviata!');
    startListening();
  }, [checkSupport, log, startListening, updateStatus]);

  // Stop session
  const stop = useCallback(() => {
    log('=== STOP SESSIONE ===');
    isStoppedRef.current = true;
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    
    speechSynthesis.cancel();
    
    setLiveTranscript('');
    setPendingResponse(null);
    updateStatus('idle');
  }, [log, updateStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      log(newMuted ? '🔇 Mute ON' : '🔊 Mute OFF');
      
      if (newMuted && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      } else if (!newMuted && status !== 'speaking' && status !== 'thinking' && status !== 'ready_to_speak') {
        startListening();
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
    pendingResponse,
    start,
    stop,
    toggleMute,
    playPendingResponse
  };
};
