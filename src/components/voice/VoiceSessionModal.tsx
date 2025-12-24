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
    }
  };

  const handleEnd = async () => {
    voiceSession.stop();
    
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

          {/* Duration */}
          {startTime && (
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatDuration(duration)}
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
                className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90"
                onClick={handleStart}
                disabled={startSession.isPending}
              >
                <Phone className="w-6 h-6" />
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
