import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  enabled?: boolean;
}

/**
 * Hook to detect user inactivity and trigger a callback
 * Monitors: mouse, keyboard, touch, scroll events
 */
export function useIdleTimer({ timeout, onIdle, enabled = true }: UseIdleTimerOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onIdleRef = useRef(onIdle);
  
  // Keep callback ref updated
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onIdleRef.current();
      }, timeout);
    }
  }, [timeout, enabled]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      return;
    }

    // Events that reset the timer
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'keypress',
      'scroll',
      'touchstart',
      'touchmove',
      'click',
      'focus',
    ];

    // Start the timer
    resetTimer();

    // Add event listeners
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also listen to visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, resetTimer]);

  // Expose reset function for manual resets
  return { resetTimer };
}
