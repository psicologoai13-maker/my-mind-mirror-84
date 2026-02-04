import React from 'react';
import { motion } from 'framer-motion';

const PARTICLES = [
  { id: 1, size: 'w-1.5 h-1.5', top: '15%', left: '10%', delay: 0, duration: 8 },
  { id: 2, size: 'w-2 h-2', top: '25%', left: '85%', delay: 1.5, duration: 10 },
  { id: 3, size: 'w-1 h-1', top: '60%', left: '15%', delay: 0.5, duration: 9 },
  { id: 4, size: 'w-1.5 h-1.5', top: '70%', left: '80%', delay: 2, duration: 7 },
  { id: 5, size: 'w-2 h-2', top: '40%', left: '5%', delay: 3, duration: 11 },
  { id: 6, size: 'w-1 h-1', top: '20%', left: '70%', delay: 1, duration: 8 },
  { id: 7, size: 'w-1.5 h-1.5', top: '80%', left: '25%', delay: 2.5, duration: 10 },
  { id: 8, size: 'w-1 h-1', top: '50%', left: '90%', delay: 0, duration: 9 },
];

const FloatingParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          className={`
            absolute rounded-full
            ${particle.size}
            bg-gradient-to-br from-[hsl(var(--aria-violet)/0.25)] to-[hsl(var(--aria-indigo)/0.15)]
          `}
          style={{
            top: particle.top,
            left: particle.left,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.1, 0.3, 0.15, 0.25, 0.1],
            y: [0, -20, -10, -25, 0],
            x: [0, 10, -5, 15, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
