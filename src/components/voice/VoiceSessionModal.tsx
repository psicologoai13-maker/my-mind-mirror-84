import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Phone } from 'lucide-react';
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  
  const { startSession, endSession } = useSessions();
  
  const voiceSession = useVoiceSession({
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
      const result = await startSession.mutateAsync('voice');
      if (result?.id) {
        setSessionId(result.id);
      }
      
      setStartTime(new Date());
      setDuration(0);
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

  // Status colors and labels
  const getStatusConfig = () => {
    switch (voiceSession.status) {
      case 'listening':
        return { 
          color: 'bg-green-500', 
          ringColor: 'ring-green-500/30',
          label: 'Ti ascolto...',
          labelClass: 'text-green-600 bg-green-100 dark:bg-green-900/30'
        };
      case 'thinking':
        return { 
          color: 'bg-yellow-500', 
          ringColor: 'ring-yellow-500/30',
          label: 'Sto pensando...',
          labelClass: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
        };
      case 'speaking':
        return { 
          color: 'bg-blue-500', 
          ringColor: 'ring-blue-500/30',
          label: 'Sto parlando...',
          labelClass: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
        };
      default:
        return { 
          color: 'bg-muted', 
          ringColor: 'ring-muted/30',
          label: '',
          labelClass: ''
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && isSessionActive) {
        handleEnd();
      } else {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted/30 border-none">
        <div className="flex flex-col items-center py-8 px-4 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Sessione Vocale
            </h2>
            <p className="text-sm text-muted-foreground">
              Parla naturalmente, come in una telefonata
            </p>
          </div>

          {/* Duration */}
          {startTime && (
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatDuration(duration)}
            </div>
          )}

          {/* Status Circle */}
          <div className="relative">
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
              statusConfig.color,
              isSessionActive && "ring-8 animate-pulse",
              statusConfig.ringColor
            )}>
              {voiceSession.status === 'listening' && (
                <Mic className="w-12 h-12 text-white" />
              )}
              {voiceSession.status === 'thinking' && (
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {voiceSession.status === 'speaking' && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-2 bg-white rounded-full animate-bounce"
                      style={{ 
                        height: `${20 + Math.random() * 20}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}
              {!isSessionActive && (
                <Phone className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Status Label */}
          {isSessionActive && statusConfig.label && (
            <div className={cn(
              "text-sm font-medium px-4 py-2 rounded-full",
              statusConfig.labelClass
            )}>
              {statusConfig.label}
            </div>
          )}

          {/* Live Transcript */}
          {voiceSession.liveTranscript && (
            <div className="w-full bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
              <p className="text-foreground italic">"{voiceSession.liveTranscript}"</p>
            </div>
          )}

          {/* Error Message */}
          {voiceSession.errorMessage && (
            <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
              ⚠️ {voiceSession.errorMessage}
            </div>
          )}

          {/* Transcript History */}
          {voiceSession.transcript.length > 0 && (
            <div className="w-full max-h-40 overflow-y-auto bg-muted/50 rounded-xl p-4 space-y-2">
              {voiceSession.transcript.slice(-4).map((line, i) => (
                <p 
                  key={i} 
                  className={cn(
                    "text-sm",
                    line.startsWith('Tu:') ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 pt-4">
            {!isSessionActive ? (
              <Button
                size="lg"
                className="h-16 px-8 rounded-full bg-green-500 hover:bg-green-600 text-white"
                onClick={handleStart}
                disabled={startSession.isPending}
              >
                <Phone className="w-5 h-5 mr-2" />
                Inizia conversazione
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
