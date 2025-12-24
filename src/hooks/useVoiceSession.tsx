import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type VoiceSessionStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface UseVoiceSessionOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: VoiceSessionStatus) => void;
  onError?: (error: string) => void;
}

export const useVoiceSession = (options: UseVoiceSessionOptions = {}) => {
  const [status, setStatus] = useState<VoiceSessionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResultRef = useRef<string>('');
  const isStoppedRef = useRef(false);
  
  const updateStatus = useCallback((newStatus: VoiceSessionStatus) => {
    console.log('Status:', newStatus);
    setStatus(newStatus);
    options.onStatusChange?.(newStatus);
  }, [options]);

  // Find best Italian voice
  const getItalianVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    
    // Priority: Google voices > Premium > Any Italian
    const googleVoice = voices.find(v => v.lang.startsWith('it') && v.name.toLowerCase().includes('google'));
    if (googleVoice) return googleVoice;
    
    const premiumVoice = voices.find(v => v.lang.startsWith('it') && (
      v.name.toLowerCase().includes('premium') || 
      v.name.toLowerCase().includes('enhanced') ||
      v.name.toLowerCase().includes('natural')
    ));
    if (premiumVoice) return premiumVoice;
    
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    return italianVoice || null;
  }, []);

  // Speak AI response
  const speakResponse = useCallback((text: string) => {
    return new Promise<void>((resolve, reject) => {
      // Cancel any pending speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const voice = getItalianVoice();
      if (voice) {
        utterance.voice = voice;
        console.log('Using voice:', voice.name);
      }
      
      utterance.onend = () => {
        console.log('TTS finished');
        resolve();
      };
      
      utterance.onerror = (e) => {
        console.error('TTS error:', e);
        reject(e);
      };
      
      speechSynthesis.speak(utterance);
    });
  }, [getItalianVoice]);

  // Send text to AI and get response
  const sendToAI = useCallback(async (userText: string) => {
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
      
      if (!response.ok) {
        throw new Error('Errore risposta AI');
      }
      
      // Parse streaming response
      let aiResponse = '';
      const reader = response.body?.getReader();
      
      if (reader) {
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
      
      return aiResponse.trim();
    } catch (error) {
      console.error('AI error:', error);
      throw error;
    }
  }, [updateStatus]);

  // Start listening
  const startListening = useCallback(() => {
    if (isStoppedRef.current) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage('Riconoscimento vocale non supportato');
      updateStatus('error');
      return;
    }
    
    // Clean up previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'it-IT';
    
    recognitionRef.current.onstart = () => {
      console.log('🎤 Listening...');
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
      
      // Show live transcript
      const displayText = finalText || interimText;
      if (displayText) {
        setLiveTranscript(displayText);
        lastResultRef.current = displayText;
      }
      
      // 1.5 second silence detection
      silenceTimeoutRef.current = setTimeout(async () => {
        const textToSend = lastResultRef.current.trim();
        if (!textToSend || isStoppedRef.current) return;
        
        console.log('📝 User said:', textToSend);
        
        // Stop listening
        try {
          recognitionRef.current?.stop();
        } catch {}
        
        setLiveTranscript('');
        setTranscript(prev => [...prev, `Tu: ${textToSend}`]);
        options.onTranscript?.(textToSend, true);
        
        try {
          // Get AI response
          const aiResponse = await sendToAI(textToSend);
          
          if (aiResponse && !isStoppedRef.current) {
            console.log('🤖 AI:', aiResponse);
            setTranscript(prev => [...prev, `AI: ${aiResponse}`]);
            options.onTranscript?.(aiResponse, false);
            
            // Speak response
            updateStatus('speaking');
            await speakResponse(aiResponse);
          }
          
          // Resume listening automatically
          if (!isStoppedRef.current) {
            startListening();
          }
          
        } catch (error) {
          console.error('Conversation error:', error);
          toast.error('Errore nella risposta');
          
          if (!isStoppedRef.current) {
            startListening();
          }
        }
      }, 1500);
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.error('Recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setErrorMessage('Permesso microfono negato');
        updateStatus('error');
        return;
      }
      
      // Auto-restart on other errors
      if (!isStoppedRef.current && event.error !== 'aborted') {
        setTimeout(() => {
          if (!isStoppedRef.current) {
            startListening();
          }
        }, 500);
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log('Recognition ended');
      // Will be restarted after speaking or manually
    };
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [options, sendToAI, speakResponse, updateStatus]);

  // Start session
  const start = useCallback(async () => {
    isStoppedRef.current = false;
    setTranscript([]);
    setErrorMessage(null);
    setLiveTranscript('');
    
    // Preload voices
    speechSynthesis.getVoices();
    
    // Request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Release immediately
    } catch (error) {
      setErrorMessage('Permesso microfono negato');
      updateStatus('error');
      return;
    }
    
    toast.success('Conversazione avviata!');
    startListening();
  }, [startListening, updateStatus]);

  // Stop session
  const stop = useCallback(() => {
    console.log('Stopping session...');
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
  }, [updateStatus]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      
      if (newMuted) {
        // Stop listening
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {}
        }
      } else {
        // Resume listening
        if (status !== 'speaking' && status !== 'thinking') {
          startListening();
        }
      }
      
      return newMuted;
    });
  }, [startListening, status]);

  return {
    status,
    isMuted,
    transcript,
    errorMessage,
    liveTranscript,
    start,
    stop,
    toggleMute
  };
};
