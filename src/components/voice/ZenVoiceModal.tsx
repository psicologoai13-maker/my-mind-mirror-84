import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, X, Mic, MicOff } from "lucide-react";
import { useElevenLabsAgent } from "@/hooks/useElevenLabsAgent";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  } = useElevenLabsAgent();

  const [isMuted, setIsMuted] = useState(false);
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

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Modern waveform visualization - Gemini Live style
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 320;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      timeRef.current += 0.008;
      const t = timeRef.current;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      
      const intensity = isActive ? (isSpeaking ? 0.8 : 0.3 + audioLevel * 0.5) : 0.15;

      // Draw multiple concentric ripple rings
      const numRings = 4;
      for (let ring = 0; ring < numRings; ring++) {
        const baseRadius = 50 + ring * 25;
        const ringPhase = t * (1.5 - ring * 0.2) + ring * 0.5;
        const ringIntensity = intensity * (1 - ring * 0.15);
        
        ctx.beginPath();
        const points = 120;
        
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          
          // Multiple wave frequencies for organic movement
          let wave = 0;
          if (isActive) {
            wave = Math.sin(angle * 3 + ringPhase * 2) * (4 + ringIntensity * 12) +
                   Math.sin(angle * 5 - ringPhase * 1.5) * (2 + ringIntensity * 8) +
                   Math.sin(angle * 7 + ringPhase * 3) * (1 + ringIntensity * 4) +
                   Math.sin(angle * 2 - ringPhase) * (3 + ringIntensity * 6);
          } else {
            wave = Math.sin(angle * 2 + ringPhase) * 2 +
                   Math.sin(angle * 3 - ringPhase * 0.5) * 1;
          }
          
          const r = baseRadius + wave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Aurora gradient stroke
        const gradient = ctx.createLinearGradient(
          centerX - baseRadius, centerY - baseRadius,
          centerX + baseRadius, centerY + baseRadius
        );
        
        if (isSpeaking) {
          gradient.addColorStop(0, `hsla(263, 70%, 65%, ${0.6 - ring * 0.12})`);
          gradient.addColorStop(0.5, `hsla(239, 84%, 67%, ${0.5 - ring * 0.1})`);
          gradient.addColorStop(1, `hsla(280, 60%, 70%, ${0.4 - ring * 0.08})`);
        } else if (isListening || isActive) {
          gradient.addColorStop(0, `hsla(263, 60%, 70%, ${0.5 - ring * 0.1})`);
          gradient.addColorStop(0.5, `hsla(250, 70%, 65%, ${0.4 - ring * 0.08})`);
          gradient.addColorStop(1, `hsla(270, 55%, 68%, ${0.35 - ring * 0.07})`);
        } else {
          gradient.addColorStop(0, `hsla(260, 30%, 70%, ${0.25 - ring * 0.05})`);
          gradient.addColorStop(1, `hsla(260, 25%, 65%, ${0.2 - ring * 0.04})`);
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.5 - ring * 0.4;
        ctx.stroke();
      }

      // Center glow orb
      const orbRadius = 35 + (isActive ? Math.sin(t * 2) * 3 + intensity * 8 : 0);
      
      const orbGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, orbRadius * 1.5
      );
      
      if (isSpeaking) {
        orbGradient.addColorStop(0, 'hsla(263, 70%, 75%, 0.9)');
        orbGradient.addColorStop(0.4, 'hsla(239, 84%, 67%, 0.6)');
        orbGradient.addColorStop(0.7, 'hsla(270, 60%, 65%, 0.3)');
        orbGradient.addColorStop(1, 'hsla(260, 50%, 60%, 0)');
      } else if (isActive) {
        orbGradient.addColorStop(0, 'hsla(263, 60%, 72%, 0.8)');
        orbGradient.addColorStop(0.5, 'hsla(250, 65%, 65%, 0.4)');
        orbGradient.addColorStop(1, 'hsla(260, 50%, 60%, 0)');
      } else {
        orbGradient.addColorStop(0, 'hsla(260, 40%, 70%, 0.5)');
        orbGradient.addColorStop(0.6, 'hsla(260, 35%, 65%, 0.2)');
        orbGradient.addColorStop(1, 'hsla(260, 30%, 60%, 0)');
      }
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Inner bright core
      const coreGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, orbRadius * 0.6
      );
      coreGradient.addColorStop(0, `hsla(0, 0%, 100%, ${isActive ? 0.9 : 0.6})`);
      coreGradient.addColorStop(0.3, `hsla(263, 70%, 85%, ${isActive ? 0.6 : 0.3})`);
      coreGradient.addColorStop(1, 'hsla(263, 70%, 75%, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
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
        className="sm:max-w-[380px] border-none p-0 overflow-hidden bg-transparent shadow-none [&>button]:hidden"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full rounded-[40px] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)'
          }}
        >
          {/* Ambient gradient background */}
          <div className="absolute inset-0">
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                background: 'radial-gradient(ellipse 100% 80% at 50% 20%, hsla(263, 70%, 60%, 0.2) 0%, transparent 60%)'
              }}
            />
            <motion.div 
              className="absolute inset-0"
              animate={{
                opacity: isSpeaking ? [0.3, 0.5, 0.3] : 0.2
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 50%, hsla(239, 84%, 67%, 0.15) 0%, transparent 50%)'
              }}
            />
          </div>

          {/* Glass border effect */}
          <div className="absolute inset-0 rounded-[40px] border border-white/10" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center py-8 px-6 min-h-[520px]">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-6">
              <div className="w-10" /> {/* Spacer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-aria-violet animate-pulse" />
                <span className="text-sm font-medium text-foreground/80">Aria</span>
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Waveform visualization */}
            <div className="flex-1 flex items-center justify-center">
              <motion.div 
                className="relative"
                animate={{
                  scale: isConnecting ? [1, 1.02, 1] : 1
                }}
                transition={{
                  duration: 1,
                  repeat: isConnecting ? Infinity : 0
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-[320px] h-[320px]"
                  style={{ width: 320, height: 320 }}
                />
              </motion.div>
            </div>

            {/* Status text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isSpeaking ? 'speaking' : isConnecting ? 'connecting' : isActive ? 'listening' : 'idle'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8"
              >
                <p className="text-base text-foreground/60 font-light tracking-wide">
                  {isConnecting ? 'Connessione...' : 
                   isSpeaking ? 'Aria sta parlando' : 
                   isActive ? 'Ti ascolto' : 
                   'Tocca per iniziare'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <AnimatePresence mode="wait">
                {!isActive ? (
                  <motion.div
                    key="start"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                  >
                    <Button
                      onClick={handleStart}
                      disabled={isConnecting}
                      className={cn(
                        "w-16 h-16 rounded-full",
                        "bg-gradient-to-br from-aria-violet to-aria-indigo",
                        "hover:opacity-90 hover:scale-105",
                        "transition-all duration-200",
                        "shadow-lg shadow-aria-violet/25",
                        "border-0",
                        isConnecting && "animate-pulse"
                      )}
                    >
                      <Phone className="w-6 h-6 text-white" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="flex items-center gap-3"
                  >
                    {/* Mute button */}
                    <Button
                      onClick={toggleMute}
                      className={cn(
                        "w-12 h-12 rounded-full",
                        "bg-white/10 backdrop-blur",
                        "hover:bg-white/20",
                        "transition-all duration-200",
                        "border border-white/10",
                        isMuted && "bg-destructive/20 border-destructive/30"
                      )}
                    >
                      {isMuted ? (
                        <MicOff className="w-5 h-5 text-destructive" />
                      ) : (
                        <Mic className="w-5 h-5 text-foreground/70" />
                      )}
                    </Button>

                    {/* End call button */}
                    <Button
                      onClick={handleStop}
                      className={cn(
                        "w-16 h-16 rounded-full",
                        "bg-destructive",
                        "hover:bg-destructive/90 hover:scale-105",
                        "transition-all duration-200",
                        "shadow-lg shadow-destructive/25",
                        "border-0"
                      )}
                    >
                      <PhoneOff className="w-6 h-6 text-white" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
