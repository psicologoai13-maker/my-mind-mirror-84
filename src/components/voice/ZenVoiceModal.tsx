import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, X } from "lucide-react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ZenVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZenVoiceModal = ({ isOpen, onClose }: ZenVoiceModalProps) => {
  const {
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    audioLevel,
    start,
    stop
  } = useRealtimeVoice();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

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

  // Orb animation with canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = 80;
      
      // Calculate dynamic values based on state
      const intensity = isActive ? (isSpeaking ? 0.6 : audioLevel * 0.8) : 0.1;
      const pulseSpeed = isSpeaking ? 3 : 2;
      
      // Outer glow layers
      for (let i = 5; i >= 0; i--) {
        const glowRadius = baseRadius + 20 + i * 15 + Math.sin(t * pulseSpeed + i * 0.5) * (10 + intensity * 20);
        const alpha = 0.03 + intensity * 0.05 - i * 0.008;
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, glowRadius
        );
        
        if (isSpeaking) {
          // Warm sage/lavender when AI speaks
          gradient.addColorStop(0, `hsla(150, 40%, 55%, ${alpha})`);
          gradient.addColorStop(0.5, `hsla(260, 35%, 60%, ${alpha * 0.7})`);
          gradient.addColorStop(1, 'hsla(150, 40%, 55%, 0)');
        } else if (isListening) {
          // Soft teal when listening
          gradient.addColorStop(0, `hsla(180, 45%, 50%, ${alpha})`);
          gradient.addColorStop(0.5, `hsla(150, 40%, 55%, ${alpha * 0.7})`);
          gradient.addColorStop(1, 'hsla(180, 45%, 50%, 0)');
        } else {
          // Neutral calm
          gradient.addColorStop(0, `hsla(200, 30%, 60%, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'hsla(200, 30%, 60%, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main orb with organic shape
      ctx.beginPath();
      const points = 64;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const noise = Math.sin(angle * 3 + t * 2) * (2 + intensity * 8) +
                     Math.sin(angle * 5 + t * 1.5) * (1 + intensity * 4) +
                     Math.sin(angle * 7 + t * 3) * (0.5 + intensity * 2);
        const r = baseRadius + noise;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      // Orb gradient fill
      const orbGradient = ctx.createRadialGradient(
        centerX - 20, centerY - 20, 0,
        centerX, centerY, baseRadius + 20
      );
      
      if (isSpeaking) {
        // Warm glow when speaking
        orbGradient.addColorStop(0, 'hsla(150, 45%, 65%, 0.95)');
        orbGradient.addColorStop(0.4, 'hsla(260, 35%, 55%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(150, 40%, 45%, 0.9)');
      } else if (isListening) {
        // Active listening state
        orbGradient.addColorStop(0, 'hsla(180, 50%, 60%, 0.9)');
        orbGradient.addColorStop(0.5, 'hsla(150, 45%, 55%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(180, 40%, 45%, 0.9)');
      } else if (isConnecting) {
        // Connecting animation
        orbGradient.addColorStop(0, 'hsla(200, 40%, 65%, 0.8)');
        orbGradient.addColorStop(1, 'hsla(200, 35%, 50%, 0.7)');
      } else {
        // Idle state
        orbGradient.addColorStop(0, 'hsla(200, 25%, 70%, 0.6)');
        orbGradient.addColorStop(1, 'hsla(200, 20%, 55%, 0.5)');
      }

      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Inner highlight
      const innerGlow = ctx.createRadialGradient(
        centerX - 25, centerY - 25, 0,
        centerX, centerY, baseRadius * 0.6
      );
      innerGlow.addColorStop(0, 'hsla(0, 0%, 100%, 0.4)');
      innerGlow.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = innerGlow;
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, isSpeaking, isListening, isConnecting, audioLevel]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-lg border-none p-0 overflow-hidden bg-transparent shadow-none [&>button]:hidden"
      >
        {/* Breathing gradient background */}
        <div className="relative w-full min-h-[500px] rounded-3xl overflow-hidden">
          {/* Animated gradient layers */}
          <div 
            className="absolute inset-0 animate-breathing-1"
            style={{
              background: 'linear-gradient(135deg, hsl(168 40% 92%) 0%, hsl(175 35% 88%) 50%, hsl(150 30% 90%) 100%)'
            }}
          />
          <div 
            className="absolute inset-0 animate-breathing-2 opacity-60"
            style={{
              background: 'linear-gradient(225deg, hsl(145 35% 90%) 0%, hsl(180 30% 92%) 50%, hsl(200 25% 94%) 100%)'
            }}
          />
          <div 
            className="absolute inset-0 animate-breathing-3 opacity-40"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, hsl(160 40% 88% / 0.8) 0%, transparent 60%)'
            }}
          />
          
          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full opacity-30 animate-float-particle"
                style={{
                  width: `${4 + i * 2}px`,
                  height: `${4 + i * 2}px`,
                  background: `hsl(${150 + i * 15}, 40%, 70%)`,
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${6 + i}s`
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-between h-full py-10 px-6 min-h-[500px]">
            {/* Close button - glassmorphism */}
            <div className="w-full flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className={cn(
                  "w-10 h-10 rounded-full",
                  "bg-white/30 backdrop-blur-md border border-white/40",
                  "hover:bg-white/40 transition-all duration-300",
                  "text-foreground/70 hover:text-foreground"
                )}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Orb visualizer */}
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-[280px] h-[280px]"
                  style={{ width: 280, height: 280 }}
                />
                
                {/* State indicator - subtle ring */}
                <div 
                  className={cn(
                    "absolute inset-0 rounded-full transition-all duration-1000 ease-in-out",
                    isConnecting && "animate-pulse"
                  )}
                  style={{
                    border: isActive 
                      ? isSpeaking 
                        ? '2px solid hsla(260, 40%, 60%, 0.3)' 
                        : '2px solid hsla(180, 45%, 55%, 0.3)'
                      : '2px solid transparent'
                  }}
                />
              </div>
            </div>

            {/* Controls - glassmorphism buttons */}
            <div className="flex items-center gap-6">
              {!isActive ? (
                <Button
                  onClick={handleStart}
                  disabled={isConnecting}
                  className={cn(
                    "w-20 h-20 rounded-full",
                    "bg-white/40 backdrop-blur-xl border border-white/50",
                    "hover:bg-white/60 hover:scale-105",
                    "transition-all duration-300 ease-out",
                    "shadow-lg shadow-primary/10",
                    "text-primary hover:text-primary",
                    isConnecting && "animate-pulse"
                  )}
                >
                  <Phone className="w-8 h-8" />
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  className={cn(
                    "w-20 h-20 rounded-full",
                    "bg-white/40 backdrop-blur-xl border border-destructive/30",
                    "hover:bg-destructive/20 hover:border-destructive/50 hover:scale-105",
                    "transition-all duration-300 ease-out",
                    "shadow-lg",
                    "text-destructive hover:text-destructive"
                  )}
                >
                  <PhoneOff className="w-8 h-8" />
                </Button>
              )}
            </div>

            {/* Connection indicator - very subtle */}
            {isActive && (
              <div className="flex items-center gap-2 mt-4">
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors duration-500",
                    isSpeaking ? "bg-accent-foreground/50" : "bg-primary/50"
                  )} 
                />
                <span className="text-xs text-foreground/40 font-light">
                  {isSpeaking ? 'Aria' : 'Connesso'}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
