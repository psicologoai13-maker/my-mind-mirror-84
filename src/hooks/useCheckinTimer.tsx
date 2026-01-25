import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'checkin_day';

// Get current date in Rome timezone (Europe/Rome = UTC+1 in winter, UTC+2 in summer)
function getRomeDateString(): string {
  const now = new Date();
  // Format date in Rome timezone
  const romeDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
  return romeDate; // Returns 'YYYY-MM-DD'
}

export function useCheckinTimer() {
  const { user } = useAuth();
  const [checkinStartedAt, setCheckinStartedAt] = useState<string | null>(null);
  const [currentRomeDay, setCurrentRomeDay] = useState<string>(getRomeDateString());

  // Load from localStorage on mount and check if it's still the same day
  useEffect(() => {
    if (!user) return;
    
    const storageKey = `${STORAGE_KEY}_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    const todayRome = getRomeDateString();
    setCurrentRomeDay(todayRome);
    
    if (stored) {
      const storedData = JSON.parse(stored);
      // If stored day is different from today (Rome time), reset
      if (storedData.day !== todayRome) {
        localStorage.removeItem(storageKey);
        setCheckinStartedAt(null);
      } else {
        setCheckinStartedAt(storedData.startedAt);
      }
    }
  }, [user]);

  // Check every minute if day has changed (for users who keep the app open past midnight)
  useEffect(() => {
    const interval = setInterval(() => {
      const newRomeDay = getRomeDateString();
      if (newRomeDay !== currentRomeDay) {
        setCurrentRomeDay(newRomeDay);
        // Reset timer for new day
        if (user) {
          localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
          setCheckinStartedAt(null);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentRomeDay, user]);

  // Start recording when user begins check-in
  const startCheckinTimer = useCallback(() => {
    if (!user) return;
    
    // Only start if not already started today
    if (checkinStartedAt) return;
    
    const now = new Date().toISOString();
    const todayRome = getRomeDateString();
    
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify({
      day: todayRome,
      startedAt: now
    }));
    setCheckinStartedAt(now);
  }, [user, checkinStartedAt]);

  // Check if it's still the same day (Rome time)
  const isSameDay = useCallback(() => {
    return currentRomeDay === getRomeDateString();
  }, [currentRomeDay]);

  // Reset timer (for new day)
  const resetTimer = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setCheckinStartedAt(null);
  }, [user]);

  // Get time until midnight Rome
  const getTimeUntilMidnight = useCallback(() => {
    const now = new Date();
    // Get current Rome time
    const romeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const romeTimeStr = romeFormatter.format(now);
    const [hours, minutes] = romeTimeStr.split(':').map(Number);
    
    const hoursUntilMidnight = 23 - hours;
    const minutesUntilMidnight = 60 - minutes;
    
    return { hours: hoursUntilMidnight, minutes: minutesUntilMidnight };
  }, []);

  return {
    checkinStartedAt,
    startCheckinTimer,
    isSameDay,
    resetTimer,
    getTimeUntilMidnight,
    currentRomeDay,
  };
}
