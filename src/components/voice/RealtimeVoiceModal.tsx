import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, Volume2 } from "lucide-react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { cn } from "@/lib/utils";

interface RealtimeVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealtimeVoiceModal = ({ isOpen, onClose }: RealtimeVoiceModalProps) => {
  const {
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    audioLevel,
    start,
    stop
  } = useRealtimeVoice();

  const handleStart = async () => {
    await start();
  };

  const handleStop = async () => {
    await stop();
    onClose();
  };

  const handleClose = async () => {
    if (isActive) {
      await stop();
    }
    onClose();
  };

  // Calculate wave animation intensity based on audio level and state
  const waveIntensity = isActive ? (isSpeaking ? 0.8 : audioLevel) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted border-none">
        <div className="flex flex-col items-center justify-center py-8 space-y-8">
          {/* Status indicator */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">
              {isConnecting ? 'Connessione...' : 
               !isActive ? 'Sessione Vocale' :
               isSpeaking ? 'Aria sta parlando' : 
               isListening ? 'Ti sto ascoltando' : 'Connesso'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isConnecting ? 'Attendere prego...' :
               !isActive ? 'Premi il pulsante per iniziare' :
               isSpeaking ? 'Puoi interrompere quando vuoi' :
               'Parla liberamente'}
            </p>
          </div>

          {/* Audio visualizer */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Background circles */}
            <div 
              className={cn(
                "absolute inset-0 rounded-full transition-all duration-300",
                isActive ? "bg-primary/10" : "bg-muted"
              )}
              style={{
                transform: `scale(${1 + waveIntensity * 0.3})`,
              }}
            />
            <div 
              className={cn(
                "absolute inset-4 rounded-full transition-all duration-200",
                isActive ? "bg-primary/20" : "bg-muted"
              )}
              style={{
                transform: `scale(${1 + waveIntensity * 0.2})`,
              }}
            />
            <div 
              className={cn(
                "absolute inset-8 rounded-full transition-all duration-150",
                isActive ? "bg-primary/30" : "bg-muted"
              )}
              style={{
                transform: `scale(${1 + waveIntensity * 0.1})`,
              }}
            />
            
            {/* Center icon */}
            <div 
              className={cn(
                "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                isActive 
                  ? isSpeaking 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20"
              )}
            >
              {isSpeaking ? (
                <Volume2 className="w-10 h-10 animate-pulse" />
              ) : (
                <Mic className={cn("w-10 h-10", isListening && "animate-pulse")} />
              )}
            </div>
          </div>

          {/* Wave bars visualization */}
          {isActive && (
            <div className="flex items-end justify-center gap-1 h-12">
              {[...Array(9)].map((_, i) => {
                const delay = i * 0.1;
                const baseHeight = 20;
                const maxHeight = 48;
                const height = baseHeight + (waveIntensity * (maxHeight - baseHeight) * (1 + Math.sin(Date.now() / 200 + i) * 0.3));
                
                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 rounded-full transition-all duration-75",
                      isSpeaking ? "bg-accent" : "bg-primary"
                    )}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${delay}s`
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            {!isActive ? (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={isConnecting}
                className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600 text-white"
              >
                <Phone className="w-6 h-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStop}
                variant="destructive"
                className="rounded-full w-16 h-16"
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Connection quality indicator */}
          {isActive && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Connessione attiva</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
