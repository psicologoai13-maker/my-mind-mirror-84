import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Phone, Volume2 } from 'lucide-react';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import { useSessions } from '@/hooks/useSessions';
import { cn } from '@/lib/utils';

interface LogEntry {
  message: string;
  isError: boolean;
  timestamp: Date;
}

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);
  
  const { startSession, endSession } = useSessions();
  
  const addLog = (message: string, isError = false) => {
    setLogs(prev => [...prev, { message, isError, timestamp: new Date() }]);
  };
  
  const voiceSession = useVoiceSession({
    onTranscript: (text, isUser) => {
      console.log(`${isUser ? 'User' : 'AI'}: ${text}`);
    },
    onLog: (message, isError) => {
      addLog(message, isError || false);
    }
  });

  // Auto-scroll logs
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

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

  // Clear logs when modal closes
  useEffect(() => {
    if (!open) {
      setLogs([]);
    }
  }, [open]);

  const handleStart = async () => {
    setLogs([]);
    addLog('=== CLICK PULSANTE VERDE ===');
    
    try {
      addLog('Creazione sessione DB...');
      const result = await startSession.mutateAsync('voice');
      if (result?.id) {
        setSessionId(result.id);
        addLog(`Sessione DB creata: ${result.id.substring(0, 8)}...`);
      }
      
      setStartTime(new Date());
      setDuration(0);
      await voiceSession.start();
    } catch (error) {
      addLog(`Errore start: ${error}`, true);
    }
  };

  const handleEnd = async () => {
    addLog('=== CHIUSURA SESSIONE ===');
    voiceSession.stop();
    
    if (sessionId) {
      try {
        await endSession.mutateAsync({
          sessionId,
          transcript: voiceSession.transcript.join('\n'),
        });
        addLog('Sessione salvata');
      } catch (error) {
        addLog(`Errore salvataggio: ${error}`, true);
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
      case 'ready_to_speak':
        return { 
          color: 'bg-purple-500', 
          ringColor: 'ring-purple-500/30',
          label: 'Risposta pronta!',
          labelClass: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30'
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
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted/30 border-none max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex flex-col items-center py-4 px-4 space-y-4 flex-1 min-h-0">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="font-display text-xl font-bold text-foreground">
              Sessione Vocale
            </h2>
          </div>

          {/* Browser not supported */}
          {!voiceSession.isSupported && (
            <div className="w-full bg-destructive text-destructive-foreground p-4 rounded-xl text-center">
              <p className="text-lg font-bold">⚠️ BROWSER NON SUPPORTATO</p>
              <p className="text-sm mt-1">Usa Chrome o Safari su mobile</p>
            </div>
          )}

          {/* Duration */}
          {startTime && (
            <div className="text-3xl font-mono font-bold text-foreground">
              {formatDuration(duration)}
            </div>
          )}

          {/* Status Circle */}
          <div className="relative">
            <div className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
              statusConfig.color,
              isSessionActive && "ring-8 animate-pulse",
              statusConfig.ringColor
            )}>
              {voiceSession.status === 'listening' && (
                <Mic className="w-10 h-10 text-white" />
              )}
              {voiceSession.status === 'thinking' && (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {voiceSession.status === 'ready_to_speak' && (
                <Volume2 className="w-10 h-10 text-white" />
              )}
              {voiceSession.status === 'speaking' && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i}
                      className="w-1.5 bg-white rounded-full animate-bounce"
                      style={{ 
                        height: `${16 + Math.random() * 16}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}
              {!isSessionActive && (
                <Phone className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Status Label */}
          {isSessionActive && statusConfig.label && (
            <div className={cn(
              "text-sm font-medium px-3 py-1.5 rounded-full",
              statusConfig.labelClass
            )}>
              {statusConfig.label}
            </div>
          )}

          {/* Live Transcript */}
          {voiceSession.liveTranscript && (
            <div className="w-full bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
              <p className="text-foreground italic text-sm">"{voiceSession.liveTranscript}"</p>
            </div>
          )}

          {/* PENDING RESPONSE - Show AI text + Listen button */}
          {voiceSession.pendingResponse && (
            <div className="w-full space-y-3">
              <div className="bg-muted/50 border border-border rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-1">Risposta AI:</p>
                <p className="text-foreground text-sm">{voiceSession.pendingResponse}</p>
              </div>
              
              <Button
                size="lg"
                className="w-full h-14 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-lg font-bold animate-pulse"
                onClick={voiceSession.playPendingResponse}
              >
                <Volume2 className="w-6 h-6 mr-2" />
                🔊 Ascolta la risposta
              </Button>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isSessionActive ? (
              <Button
                size="lg"
                className="h-14 px-6 rounded-full bg-green-500 hover:bg-green-600 text-white"
                onClick={handleStart}
                disabled={startSession.isPending || !voiceSession.isSupported}
              >
                <Phone className="w-5 h-5 mr-2" />
                Inizia conversazione
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant={voiceSession.isMuted ? "destructive" : "outline"}
                  className="h-12 w-12 rounded-full"
                  onClick={voiceSession.toggleMute}
                >
                  {voiceSession.isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="destructive"
                  className="h-14 w-14 rounded-full"
                  onClick={handleEnd}
                >
                  <X className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* DEBUG LOG BOX */}
          <div className="w-full flex-1 min-h-0">
            <p className="text-xs text-muted-foreground mb-1 font-mono">📋 Debug Log:</p>
            <div 
              ref={logBoxRef}
              className="w-full h-32 bg-muted/80 rounded-lg p-2 overflow-y-auto font-mono text-xs space-y-0.5"
            >
              {logs.length === 0 ? (
                <p className="text-muted-foreground">Premi il pulsante verde per iniziare...</p>
              ) : (
                logs.map((log, i) => (
                  <p 
                    key={i} 
                    className={cn(
                      "break-words",
                      log.isError ? "text-destructive font-bold" : "text-foreground"
                    )}
                  >
                    {log.message}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
