import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

const FloatingParticles: React.FC = () => {
  // More visible particles with Aurora colors
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      'rgba(155,111,208,0.4)',  // Violet
      'rgba(167,139,250,0.35)', // Light violet
      'rgba(129,140,248,0.3)',  // Indigo
      'rgba(99,102,241,0.25)',  // Deep indigo
    ];
    
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2, // 2-6px
      duration: Math.random() * 12 + 15, // 15-27s
      delay: Math.random() * 8,
      opacity: Math.random() * 0.3 + 0.2, // 0.2-0.5
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [particle.opacity * 0.6, particle.opacity, particle.opacity * 0.6],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
