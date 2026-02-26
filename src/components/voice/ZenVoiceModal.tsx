import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, X } from "lucide-react";
import { useElevenLabsAgent } from "@/hooks/useElevenLabsAgent";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ZenVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Floating particle component
const FloatingParticle = forwardRef<HTMLDivElement, {
  delay: number;
  duration: number;
  size: number;
  x: number;
  y: number;
}>(({ delay, duration, size, x, y }, ref) => (
  <motion.div
    ref={ref}
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      left: `${x}%`,
      top: `${y}%`,
      background: 'radial-gradient(circle, hsla(263, 70%, 75%, 0.6) 0%, transparent 70%)',
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.8, 0],
      scale: [0.5, 1, 0.5],
      y: [0, -30, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
));
FloatingParticle.displayName = 'FloatingParticle';

export const ZenVoiceModal = ({ isOpen, onClose }: ZenVoiceModalProps) => {
  const {
    isActive,
    isConnecting,
    isSpeaking,
    isListening,
    audioLevel,
    transcript,
    start,
    stop
  } = useElevenLabsAgent();

  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Hide/show bottom nav when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('hide-bottom-nav'));
    } else {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
    }
    
    return () => {
      window.dispatchEvent(new CustomEvent('show-bottom-nav'));
    };
  }, [isOpen]);

  // Generate particles only once
  const particles = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 0.3,
      duration: 3 + Math.random() * 2,
      size: 4 + Math.random() * 8,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
    })), []
  );

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

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      await handleClose();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Get last transcript entry
  const lastUserEntry = transcript.filter(t => t.role === 'user').slice(-1)[0];
  const lastAssistantEntry = transcript.filter(t => t.role === 'assistant').slice(-1)[0];

  // Avatar animation - organic breathing orb with face-like features
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
      timeRef.current += 0.012;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      
      const baseIntensity = isActive ? (isSpeaking ? 1 : 0.5 + audioLevel * 0.5) : 0.2;

      // Outer glow rings (Aurora effect)
      for (let ring = 3; ring >= 0; ring--) {
        const ringRadius = 85 + ring * 20 + (isActive ? Math.sin(t * 1.5 + ring) * 5 : 0);
        const ringOpacity = (0.15 - ring * 0.03) * baseIntensity;
        
        const gradient = ctx.createRadialGradient(
          centerX, centerY, ringRadius * 0.5,
          centerX, centerY, ringRadius
        );
        
        if (isSpeaking) {
          gradient.addColorStop(0, `hsla(263, 80%, 70%, ${ringOpacity * 1.5})`);
          gradient.addColorStop(0.5, `hsla(239, 84%, 67%, ${ringOpacity})`);
          gradient.addColorStop(1, 'transparent');
        } else {
          gradient.addColorStop(0, `hsla(260, 60%, 70%, ${ringOpacity})`);
          gradient.addColorStop(1, 'transparent');
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main avatar orb with breathing effect
      const breathe = Math.sin(t * 2) * (isActive ? 8 : 3);
      const speakPulse = isSpeaking ? Math.sin(t * 8) * 5 + audioLevel * 10 : 0;
      const orbRadius = 55 + breathe + speakPulse;

      // Orb outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, orbRadius * 0.3,
        centerX, centerY, orbRadius * 1.8
      );
      
      if (isSpeaking) {
        glowGradient.addColorStop(0, 'hsla(263, 85%, 75%, 0.9)');
        glowGradient.addColorStop(0.3, 'hsla(250, 80%, 70%, 0.6)');
        glowGradient.addColorStop(0.6, 'hsla(239, 84%, 67%, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
      } else if (isActive) {
        glowGradient.addColorStop(0, 'hsla(263, 70%, 72%, 0.8)');
        glowGradient.addColorStop(0.4, 'hsla(260, 65%, 68%, 0.4)');
        glowGradient.addColorStop(1, 'transparent');
      } else {
        glowGradient.addColorStop(0, 'hsla(260, 50%, 70%, 0.5)');
        glowGradient.addColorStop(0.5, 'hsla(260, 40%, 65%, 0.2)');
        glowGradient.addColorStop(1, 'transparent');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Main orb body
      const orbGradient = ctx.createRadialGradient(
        centerX - orbRadius * 0.3, centerY - orbRadius * 0.3, 0,
        centerX, centerY, orbRadius
      );
      
      if (isSpeaking) {
        orbGradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.95)');
        orbGradient.addColorStop(0.3, 'hsla(263, 80%, 85%, 0.9)');
        orbGradient.addColorStop(0.7, 'hsla(250, 75%, 70%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(239, 84%, 60%, 0.8)');
      } else if (isActive) {
        orbGradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.9)');
        orbGradient.addColorStop(0.4, 'hsla(263, 65%, 80%, 0.85)');
        orbGradient.addColorStop(1, 'hsla(260, 60%, 65%, 0.75)');
      } else {
        orbGradient.addColorStop(0, 'hsla(0, 0%, 100%, 0.7)');
        orbGradient.addColorStop(0.5, 'hsla(260, 40%, 75%, 0.6)');
        orbGradient.addColorStop(1, 'hsla(260, 35%, 60%, 0.5)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = orbGradient;
      ctx.fill();

      // Inner bright highlight (gives 3D depth)
      const highlightGradient = ctx.createRadialGradient(
        centerX - orbRadius * 0.35, centerY - orbRadius * 0.35, 0,
        centerX - orbRadius * 0.2, centerY - orbRadius * 0.2, orbRadius * 0.5
      );
      highlightGradient.addColorStop(0, `hsla(0, 0%, 100%, ${isActive ? 0.8 : 0.5})`);
      highlightGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // Sound waves when speaking (emanating circles)
      if (isSpeaking) {
        for (let wave = 0; wave < 3; wave++) {
          const waveProgress = ((t * 0.8 + wave * 0.33) % 1);
          const waveRadius = orbRadius + waveProgress * 60;
          const waveOpacity = (1 - waveProgress) * 0.4;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(263, 70%, 70%, ${waveOpacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Listening indicator (pulsing ring)
      if (isListening && !isSpeaking) {
        const listenPulse = (Math.sin(t * 4) + 1) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbRadius + 15 + listenPulse * 10, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(263, 70%, 70%, ${0.3 + listenPulse * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, isSpeaking, isListening, isConnecting, audioLevel]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="w-screen h-screen max-w-none max-h-none m-0 p-0 border-none rounded-none bg-transparent [&>button]:hidden"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Conversazione vocale con Aria</DialogTitle>
        </VisuallyHidden>
        
        {/* Full screen immersive container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, hsl(260, 30%, 8%) 0%, hsl(250, 35%, 12%) 50%, hsl(260, 25%, 6%) 100%)'
          }}
        >
          {/* Ambient Aurora background */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              className="absolute inset-0"
              animate={{
                opacity: isSpeaking ? [0.4, 0.6, 0.4] : [0.2, 0.3, 0.2]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: 'radial-gradient(ellipse 120% 80% at 50% 30%, hsla(263, 70%, 50%, 0.25) 0%, transparent 60%)'
              }}
            />
            <motion.div 
              className="absolute inset-0"
              animate={{
                opacity: isSpeaking ? [0.3, 0.5, 0.3] : 0.15
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: 'radial-gradient(ellipse 100% 60% at 30% 70%, hsla(239, 84%, 50%, 0.2) 0%, transparent 50%)'
              }}
            />
            <motion.div 
              className="absolute inset-0"
              animate={{
                opacity: isSpeaking ? [0.2, 0.4, 0.2] : 0.1
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              style={{
                background: 'radial-gradient(ellipse 80% 50% at 70% 60%, hsla(280, 60%, 45%, 0.15) 0%, transparent 50%)'
              }}
            />
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {isActive && particles.map(p => (
              <FloatingParticle key={p.id} {...p} />
            ))}
          </div>

          {/* Top bar */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 w-full flex items-center justify-between px-6"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 16px) + 16px)' }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="w-11 h-11 rounded-full bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                isSpeaking ? "bg-aria-violet animate-pulse" : 
                isActive ? "bg-green-400" : "bg-white/40"
              )} />
              <span className="text-sm font-medium text-white/80">
                {isConnecting ? 'Connessione...' : 
                 isSpeaking ? 'Aria' : 
                 isActive ? 'In ascolto' : 'Aria'}
              </span>
            </motion.div>

            <div className="w-11" /> {/* Spacer for balance */}
          </motion.div>

          {/* Center: Avatar + Status */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center -mt-8">
            {/* Avatar canvas */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, delay: 0.1 }}
              className="relative"
            >
              <canvas
                ref={canvasRef}
                className="w-[280px] h-[280px]"
                style={{ width: 280, height: 280 }}
              />
            </motion.div>

            {/* Status text */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isSpeaking ? 'speaking' : isConnecting ? 'connecting' : isActive ? 'listening' : 'idle'}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="mt-8 text-center"
              >
                <p className="text-xl font-light text-white/90 tracking-wide">
                  {isConnecting ? 'Mi sto preparando...' : 
                   isSpeaking ? 'Sto parlando' : 
                   isActive ? 'Ti ascolto...' : 
                   'Tocca per parlare'}
                </p>
                {isActive && !isSpeaking && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-white/50 mt-2"
                  >
                    Parla quando vuoi
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Live transcript preview */}
            <AnimatePresence>
              {isActive && (lastUserEntry || lastAssistantEntry) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 max-w-[320px] px-4"
                >
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
                    <p className="text-sm text-white/70 line-clamp-2 text-center">
                      {lastAssistantEntry?.text || lastUserEntry?.text}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom controls */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative z-10 w-full flex items-center justify-center gap-6 pb-safe-bottom"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 40px)' }}
          >
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
                      "w-20 h-20 rounded-full",
                      "bg-gradient-to-br from-aria-violet via-aria-indigo to-aria-violet",
                      "hover:scale-105 active:scale-95",
                      "transition-all duration-200",
                      "shadow-2xl shadow-aria-violet/40",
                      "border-2 border-white/20",
                      isConnecting && "animate-pulse"
                    )}
                  >
                    <Mic className="w-8 h-8 text-white" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="active"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="flex items-center gap-8"
                >
                  {/* Mute button */}
                  <Button
                    onClick={toggleMute}
                    className={cn(
                      "w-14 h-14 rounded-full",
                      "bg-white/10 backdrop-blur-md",
                      "hover:bg-white/20 active:scale-95",
                      "transition-all duration-200",
                      "border border-white/20",
                      isMuted && "bg-red-500/20 border-red-400/40"
                    )}
                  >
                    {isMuted ? (
                      <MicOff className="w-6 h-6 text-red-400" />
                    ) : (
                      <Mic className="w-6 h-6 text-white/80" />
                    )}
                  </Button>

                  {/* End call button */}
                  <Button
                    onClick={handleStop}
                    className={cn(
                      "w-20 h-20 rounded-full",
                      "bg-red-500",
                      "hover:bg-red-600 hover:scale-105 active:scale-95",
                      "transition-all duration-200",
                      "shadow-2xl shadow-red-500/40",
                      "border-2 border-red-400/30"
                    )}
                  >
                    <PhoneOff className="w-8 h-8 text-white" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
