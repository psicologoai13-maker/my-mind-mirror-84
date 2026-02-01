import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'checkin_day';
const RESET_HOUR = 6; // Reset at 6 AM Rome time

// Get current "logical day" in Rome timezone
// The day changes at 6 AM, not midnight
function getRomeLogicalDay(): string {
  const now = new Date();
  
  // Get Rome date/time components
  const romeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false
  });
  
  const parts = romeFormatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  
  // If before 6 AM, consider it still the previous day
  if (hour < RESET_HOUR) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return yesterdayFormatter.format(yesterday);
  }
  
  return `${year}-${month}-${day}`;
}

export function useCheckinTimer() {
  const { user } = useAuth();
  const [checkinStartedAt, setCheckinStartedAt] = useState<string | null>(null);
  const [currentRomeDay, setCurrentRomeDay] = useState<string>(getRomeLogicalDay());

  // Load from localStorage on mount and check if it's still the same logical day
  useEffect(() => {
    if (!user) return;
    
    const storageKey = `${STORAGE_KEY}_${user.id}`;
    const stored = localStorage.getItem(storageKey);
    const todayRome = getRomeLogicalDay();
    setCurrentRomeDay(todayRome);
    
    if (stored) {
      const storedData = JSON.parse(stored);
      // If stored day is different from today (Rome logical day), reset
      if (storedData.day !== todayRome) {
        localStorage.removeItem(storageKey);
        setCheckinStartedAt(null);
      } else {
        setCheckinStartedAt(storedData.startedAt);
      }
    }
  }, [user]);

  // Check every minute if day has changed (for users who keep the app open past 6 AM)
  useEffect(() => {
    const interval = setInterval(() => {
      const newRomeDay = getRomeLogicalDay();
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
    const todayRome = getRomeLogicalDay();
    
    localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify({
      day: todayRome,
      startedAt: now
    }));
    setCheckinStartedAt(now);
  }, [user, checkinStartedAt]);

  // Check if it's still the same logical day (Rome time, 6 AM boundary)
  const isSameDay = useCallback(() => {
    return currentRomeDay === getRomeLogicalDay();
  }, [currentRomeDay]);

  // Reset timer (for new day)
  const resetTimer = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`${STORAGE_KEY}_${user.id}`);
    setCheckinStartedAt(null);
  }, [user]);

  // Get time until 6 AM Rome (next reset)
  const getTimeUntilReset = useCallback(() => {
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
    
    let hoursUntilReset: number;
    let minutesUntilReset: number;
    
    if (hours >= RESET_HOUR) {
      // After 6 AM - calculate until next day 6 AM
      hoursUntilReset = 23 - hours + RESET_HOUR;
      minutesUntilReset = 60 - minutes;
    } else {
      // Before 6 AM - calculate until 6 AM today
      hoursUntilReset = RESET_HOUR - hours - 1;
      minutesUntilReset = 60 - minutes;
    }
    
    return { hours: hoursUntilReset, minutes: minutesUntilReset };
  }, []);

  return {
    checkinStartedAt,
    startCheckinTimer,
    isSameDay,
    resetTimer,
    getTimeUntilReset,
    currentRomeDay,
  };
}
