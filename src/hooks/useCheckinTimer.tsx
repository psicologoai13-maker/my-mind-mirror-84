import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'checkin_started_at';

export function useCheckinTimer() {
  const { user } = useAuth();
  const [checkinStartedAt, setCheckinStartedAt] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (!user) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      const startTime = new Date(stored);
      const now = new Date();
      const hoursSince = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      // If more than 24 hours have passed, clear the timer
      if (hoursSince >= 24) {
        localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
        setCheckinStartedAt(null);
      } else {
        setCheckinStartedAt(stored);
      }
    }
  }, [user]);

  // Start the 24h timer when user begins check-in
  const startCheckinTimer = useCallback(() => {
    if (!user) return;
    
    // Only start if not already started today
    if (checkinStartedAt) return;
    
    const now = new Date().toISOString();
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, now);
    setCheckinStartedAt(now);
  }, [user, checkinStartedAt]);

  // Check if timer is active (within 24h)
  const isTimerActive = useCallback(() => {
    if (!checkinStartedAt) return false;
    
    const startTime = new Date(checkinStartedAt);
    const now = new Date();
    const hoursSince = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    return hoursSince < 24;
  }, [checkinStartedAt]);

  // Reset timer (for next day)
  const resetTimer = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setCheckinStartedAt(null);
  }, [user]);

  return {
    checkinStartedAt,
    startCheckinTimer,
    isTimerActive,
    resetTimer,
  };
}
