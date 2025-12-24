import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Phone, Wifi, WifiOff } from 'lucide-react';
import { VoiceWaveform } from './VoiceWaveform';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { useSessions } from '@/hooks/useSessions';
import { cn } from '@/lib/utils';

interface VoiceSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceSessionModal: React.FC<VoiceSessionModalProps> = ({
  open,
  onOpenChange
}) => {
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { startSession, endSession } = useSessions();
  
  const voiceSession = useVoiceSession({
    onAudioLevel: (level, isInput) => {
      if (isInput) {
        setInputLevel(level);
      } else {
        setOutputLevel(level);
      }
    },
    onTranscript: (text, isUser) => {
      console.log(`${isUser ? 'User' : 'AI'}: ${text}`);
    },
    onError: (error) => {
      setLocalError(error);
    }
  });

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (startTime && voiceSession.status !== 'idle') {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [startTime, voiceSession.status]);

  const handleStart = async () => {
    setLocalError(null);
    try {
      // Create session in database
      const result = await startSession.mutateAsync('voice');
      if (result?.id) {
        setSessionId(result.id);
      }
      
      setStartTime(new Date());
      setDuration(0);
      
      // Start voice session
      await voiceSession.start();
    } catch (error) {
      console.error('Failed to start session:', error);
      setLocalError(error instanceof Error ? error.message : 'Errore avvio sessione');
    }
  };

  const handleEnd = async () => {
    voiceSession.stop();
    setLocalError(null);
    
    if (sessionId) {
      try {
        await endSession.mutateAsync({
          sessionId,
          transcript: voiceSession.transcript.join('\n'),
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }
    
    setSessionId(null);
    setStartTime(null);
    setDuration(0);
    onOpenChange(false);
  };

  const getButtonLabel = () => {
    switch (voiceSession.status) {
      case 'connecting':
        return 'Connessione...';
      case 'connected':
        return 'Collegato';
      case 'listening':
        return '🎤 In ascolto';
      case 'speaking':
        return '🔊 AI parla';
      case 'error':
        return 'Riprova';
      default:
        return 'Inizia conversazione';
    }
  };

  const getStatusText = () => {
    switch (voiceSession.status) {
      case 'connecting':
        return 'Connessione in corso...';
      case 'listening':
        return 'Parla pure, ti ascolto';
      case 'speaking':
        return 'Sto rispondendo...';
      default:
        return '';
    }
  };

  const displayError = localError || voiceSession.errorMessage;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isSessionActive = voiceSession.status !== 'idle' && voiceSession.status !== 'error';

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && isSessionActive) {
        handleEnd();
      } else {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted/30 border-none">
        <div className="flex flex-col items-center py-8 px-4 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Sessione Vocale
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {voiceSession.mode === 'websocket' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span>Real-time</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-yellow-500" />
                  <span>Modalità alternativa</span>
                </>
              )}
            </div>
          </div>

          {/* Duration & Status */}
          {startTime && (
            <div className="text-center space-y-2">
              <div className="text-4xl font-mono font-bold text-foreground">
                {formatDuration(duration)}
              </div>
              {/* Status text */}
              {isSessionActive && (
                <div className={cn(
                  "text-sm font-medium px-3 py-1 rounded-full inline-block",
                  voiceSession.status === 'listening' && "text-green-600 bg-green-100 dark:bg-green-900/30",
                  voiceSession.status === 'speaking' && "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
                  voiceSession.status === 'connecting' && "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30"
                )}>
                  {getStatusText()}
                </div>
              )}
              {/* Error display */}
              {displayError && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  ⚠️ {displayError}
                </div>
              )}
            </div>
          )}
          
          {/* Error display when not started */}
          {!startTime && displayError && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg text-center">
              ⚠️ {displayError}
            </div>
          )}

          {/* Waveform */}
          <VoiceWaveform
            isActive={isSessionActive}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
            status={voiceSession.status}
          />

          {/* Transcript preview */}
          {voiceSession.transcript.length > 0 && (
            <div className="w-full max-h-32 overflow-y-auto bg-muted/50 rounded-xl p-4 space-y-2">
              {voiceSession.transcript.slice(-3).map((line, i) => (
                <p 
                  key={i} 
                  className={cn(
                    "text-sm",
                    line.startsWith('Tu:') ? "text-primary" : "text-foreground"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isSessionActive ? (
              <Button
                size="lg"
                className={cn(
                  "h-16 px-8 rounded-full transition-all duration-300",
                  voiceSession.status === 'connecting' 
                    ? "bg-yellow-500 hover:bg-yellow-600 animate-pulse" 
                    : voiceSession.status === 'error'
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-primary hover:bg-primary/90"
                )}
                onClick={handleStart}
                disabled={startSession.isPending || voiceSession.status === 'connecting'}
              >
                {voiceSession.status === 'connecting' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connessione...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    {getButtonLabel()}
                  </span>
                )}
              </Button>
            ) : (
              <>
                {/* Mute button */}
                <Button
                  size="lg"
                  variant={voiceSession.isMuted ? "destructive" : "outline"}
                  className="h-14 w-14 rounded-full"
                  onClick={voiceSession.toggleMute}
                >
                  {voiceSession.isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                {/* End call button */}
                <Button
                  size="lg"
                  variant="destructive"
                  className="h-16 w-16 rounded-full"
                  onClick={handleEnd}
                >
                  <X className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          {!isSessionActive && (
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Premi il pulsante per iniziare a parlare con il tuo Psicologo AI. 
              Parla naturalmente, come in una telefonata.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
