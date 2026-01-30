import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, X, Mic, MicOff } from "lucide-react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
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
  } = useRealtimeVoice();

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

  // Orb animation with canvas - Aurora gradient (Aria's identity)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 260;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const animate = () => {
      timeRef.current += 0.015;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = 70;
      
      const intensity = isActive ? (isSpeaking ? 0.7 : audioLevel * 0.9) : 0.15;
      const pulseSpeed = isSpeaking ? 2.5 : 1.5;
      
      // Aurora outer glow layers (Aria's brand: Amethyst/Indigo/Violet)
      for (let i = 5; i >= 0; i--) {
        const glowRadius = baseRadius + 25 + i * 18 + Math.sin(t * pulseSpeed + i * 0.4) * (12 + intensity * 25);
        const alpha = 0.04 + intensity * 0.06 - i * 0.01;
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, glowRadius
        );
        
        if (isSpeaking) {
          // Aurora glow when AI speaks (Amethyst + Indigo)
          gradient.addColorStop(0, `hsla(270, 50%, 65%, ${alpha * 1.2})`);
          gradient.addColorStop(0.4, `hsla(239, 84%, 67%, ${alpha})`);
          gradient.addColorStop(0.7, `hsla(263, 70%, 70%, ${alpha * 0.8})`);
          gradient.addColorStop(1, 'hsla(270, 50%, 65%, 0)');
        } else if (isListening) {
          // Soft violet when listening
          gradient.addColorStop(0, `hsla(263, 70%, 72%, ${alpha})`);
          gradient.addColorStop(0.5, `hsla(239, 84%, 67%, ${alpha * 0.7})`);
          gradient.addColorStop(1, 'hsla(270, 50%, 65%, 0)');
        } else {
          // Subtle aurora idle
          gradient.addColorStop(0, `hsla(260, 40%, 70%, ${alpha * 0.6})`);
          gradient.addColorStop(1, 'hsla(260, 40%, 70%, 0)');
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main orb with organic shape
      ctx.beginPath();
      const points = 72;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const noise = Math.sin(angle * 3 + t * 1.8) * (3 + intensity * 10) +
                     Math.sin(angle * 5 + t * 1.3) * (1.5 + intensity * 5) +
                     Math.sin(angle * 7 + t * 2.5) * (0.8 + intensity * 3);
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

      // Aurora gradient fill (Aria's identity colors)
      const orbGradient = ctx.createRadialGradient(
        centerX - 15, centerY - 15, 0,
        centerX, centerY, baseRadius + 25
      );
      
      if (isSpeaking) {
        // Rich aurora when speaking
        orbGradient.addColorStop(0, 'hsla(263, 70%, 75%, 0.95)');
        orbGradient.addColorStop(0.3, 'hsla(239, 84%, 67%, 0.9)');
        orbGradient.addColorStop(0.6, 'hsla(270, 55%, 60%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(239, 84%, 55%, 0.9)');
      } else if (isListening) {
        // Active listening state
        orbGradient.addColorStop(0, 'hsla(270, 50%, 70%, 0.9)');
        orbGradient.addColorStop(0.5, 'hsla(263, 70%, 65%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(239, 70%, 60%, 0.9)');
      } else if (isConnecting) {
        // Connecting pulse
        orbGradient.addColorStop(0, 'hsla(260, 45%, 70%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(239, 60%, 60%, 0.75)');
      } else {
        // Idle - subtle aurora
        orbGradient.addColorStop(0, 'hsla(260, 35%, 75%, 0.65)');
        orbGradient.addColorStop(1, 'hsla(260, 30%, 60%, 0.55)');
      }

      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Glass highlight
      const innerGlow = ctx.createRadialGradient(
        centerX - 20, centerY - 20, 0,
        centerX, centerY, baseRadius * 0.55
      );
      innerGlow.addColorStop(0, 'hsla(0, 0%, 100%, 0.5)');
      innerGlow.addColorStop(0.5, 'hsla(0, 0%, 100%, 0.15)');
      innerGlow.addColorStop(1, 'hsla(0, 0%, 100%, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
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
        className="sm:max-w-md border-none p-0 overflow-hidden bg-transparent shadow-none [&>button]:hidden"
      >
        {/* Glass card container */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full min-h-[520px] rounded-[32px] overflow-hidden"
        >
          {/* Aurora mesh gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
          
          {/* Aurora glow layer */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 40%, hsla(263, 70%, 70%, 0.4) 0%, transparent 60%)'
            }}
          />
          <div 
            className="absolute inset-0 opacity-20 animate-pulse"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 60% 50%, hsla(239, 84%, 67%, 0.3) 0%, transparent 50%)',
              animationDuration: '4s'
            }}
          />
          
          {/* Glass overlay */}
          <div className="absolute inset-0 bg-glass/80 backdrop-blur-2xl" />
          
          {/* Floating particles - Aurora colored */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.2, 0.5, 0.2],
                  y: [0, -20, 0],
                  x: [0, Math.sin(i) * 10, 0]
                }}
                transition={{
                  duration: 4 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3
                }}
                style={{
                  width: `${3 + i * 1.5}px`,
                  height: `${3 + i * 1.5}px`,
                  background: `hsla(${260 + i * 10}, 60%, 70%, 0.6)`,
                  left: `${10 + i * 12}%`,
                  top: `${25 + (i % 4) * 18}%`,
                  filter: 'blur(1px)'
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center h-full py-8 px-6 min-h-[520px]">
            {/* Header with close button */}
            <div className="w-full flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className={cn(
                  "w-11 h-11 rounded-full",
                  "bg-glass backdrop-blur-xl border border-glass-border",
                  "hover:bg-white/20 transition-all duration-300",
                  "text-foreground/60 hover:text-foreground"
                )}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Orb visualizer */}
            <div className="flex-1 flex items-center justify-center -mt-4">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-[260px] h-[260px]"
                  style={{ width: 260, height: 260 }}
                />
                
                {/* Outer ring indicator */}
                <motion.div 
                  className="absolute inset-[-20px] rounded-full border border-aria-violet/20"
                  animate={{
                    scale: isActive ? [1, 1.05, 1] : 1,
                    opacity: isActive ? [0.3, 0.5, 0.3] : 0.2
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-5 mt-auto">
              <AnimatePresence mode="wait">
                {!isActive ? (
                  <motion.div
                    key="start"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Button
                      onClick={handleStart}
                      disabled={isConnecting}
                      className={cn(
                        "w-[72px] h-[72px] rounded-full",
                        "bg-glass backdrop-blur-xl",
                        "border-2 border-aria-violet/30",
                        "hover:border-aria-violet/50 hover:scale-105",
                        "transition-all duration-300 ease-out",
                        "shadow-glass-glow",
                        "text-aria-violet hover:text-aria-violet",
                        isConnecting && "animate-pulse"
                      )}
                    >
                      <Phone className="w-7 h-7" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-4"
                  >
                    {/* Mute button */}
                    <Button
                      onClick={toggleMute}
                      className={cn(
                        "w-14 h-14 rounded-full",
                        "bg-glass backdrop-blur-xl",
                        "border border-glass-border",
                        "hover:bg-white/20 hover:scale-105",
                        "transition-all duration-300",
                        isMuted ? "text-destructive border-destructive/30" : "text-foreground/70"
                      )}
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>

                    {/* End call button */}
                    <Button
                      onClick={handleStop}
                      className={cn(
                        "w-[72px] h-[72px] rounded-full",
                        "bg-destructive/15 backdrop-blur-xl",
                        "border-2 border-destructive/30",
                        "hover:bg-destructive/25 hover:border-destructive/50 hover:scale-105",
                        "transition-all duration-300 ease-out",
                        "text-destructive hover:text-destructive"
                      )}
                    >
                      <PhoneOff className="w-7 h-7" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status indicator */}
            <AnimatePresence>
              {isActive && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 mt-5"
                >
                  <motion.div 
                    className={cn(
                      "w-2 h-2 rounded-full",
                      isSpeaking ? "bg-aria-violet" : "bg-primary"
                    )}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-sm text-muted-foreground font-medium">
                    {isSpeaking ? 'Aria sta parlando...' : 'In ascolto'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
