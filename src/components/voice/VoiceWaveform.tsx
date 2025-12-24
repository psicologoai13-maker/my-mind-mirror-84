import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VoiceWaveformProps {
  isActive: boolean;
  inputLevel?: number;
  outputLevel?: number;
  status: 'idle' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error';
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  inputLevel = 0,
  outputLevel = 0,
  status
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(Array(32).fill(0));
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;
    const barCount = 32;
    const barWidth = width / barCount - 2;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      phaseRef.current += 0.05;
      
      const level = status === 'speaking' ? outputLevel : inputLevel;
      const baseAmplitude = isActive ? Math.max(0.1, level) : 0.05;

      for (let i = 0; i < barCount; i++) {
        // Smooth wave animation
        const wave = Math.sin(phaseRef.current + (i * 0.3)) * 0.5 + 0.5;
        const randomness = Math.random() * 0.2;
        
        let targetHeight: number;
        
        if (status === 'connecting') {
          // Pulsing animation while connecting
          targetHeight = (Math.sin(phaseRef.current * 2 + i * 0.2) * 0.3 + 0.4) * height * 0.6;
        } else if (status === 'speaking') {
          // More dynamic when AI is speaking
          targetHeight = (wave * 0.7 + randomness + baseAmplitude * 0.5) * height * 0.7;
        } else if (status === 'listening') {
          // Reactive to input level
          targetHeight = (wave * 0.3 + baseAmplitude * 0.7 + randomness * 0.3) * height * 0.6;
        } else {
          // Subtle idle animation
          targetHeight = (wave * 0.15 + 0.1) * height * 0.3;
        }
        
        // Smooth transition
        barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.15;
        const barHeight = barsRef.current[i];
        
        const x = i * (barWidth + 2);
        const y = centerY - barHeight / 2;
        
        // Gradient colors based on status
        let gradient: CanvasGradient;
        
        if (status === 'speaking') {
          gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, 'hsl(142, 76%, 50%)');
          gradient.addColorStop(1, 'hsl(142, 76%, 36%)');
        } else if (status === 'listening') {
          gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, 'hsl(262, 83%, 65%)');
          gradient.addColorStop(1, 'hsl(262, 83%, 50%)');
        } else if (status === 'connecting') {
          gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, 'hsl(45, 93%, 60%)');
          gradient.addColorStop(1, 'hsl(45, 93%, 47%)');
        } else {
          gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
          gradient.addColorStop(0, 'hsl(240, 5%, 50%)');
          gradient.addColorStop(1, 'hsl(240, 5%, 35%)');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, inputLevel, outputLevel, status]);

  return (
    <div className="relative w-full max-w-xs h-24">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Status indicator */}
      <div className={cn(
        "absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2",
        "text-sm font-medium"
      )}>
        <span className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          status === 'speaking' && "bg-green-500",
          status === 'listening' && "bg-primary",
          status === 'connecting' && "bg-yellow-500",
          status === 'error' && "bg-red-500",
          status === 'idle' && "bg-muted-foreground"
        )} />
        <span className="text-muted-foreground">
          {status === 'speaking' && 'Psicologo AI sta parlando...'}
          {status === 'listening' && 'In ascolto...'}
          {status === 'connecting' && 'Connessione...'}
          {status === 'connected' && 'Connesso'}
          {status === 'error' && 'Errore connessione'}
          {status === 'idle' && 'Pronto'}
        </span>
      </div>
    </div>
  );
};
