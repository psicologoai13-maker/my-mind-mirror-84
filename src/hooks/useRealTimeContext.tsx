import { useState, useCallback, useEffect } from 'react';
import { useUserLocation } from './useUserLocation';
import { useProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RealTimeContext {
  datetime: {
    date: string;
    day: string;
    time: string;
    period: string;
    season: string;
    holiday?: string;
  };
  location?: {
    city: string;
    region: string;
    country: string;
  };
  weather?: {
    condition: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    description: string;
  };
  news?: {
    headlines: string[];
    sports?: string[];
  };
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useRealTimeContext = () => {
  const { location, permission } = useUserLocation();
  const { profile } = useProfile();
  const { user } = useAuth();
  const [context, setContext] = useState<RealTimeContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we have a valid cached context
  const getCachedContext = useCallback((): RealTimeContext | null => {
    if (!profile?.realtime_context_cache || !profile?.realtime_context_updated_at) {
      return null;
    }
    
    const cacheAge = Date.now() - new Date(profile.realtime_context_updated_at).getTime();
    if (cacheAge < CACHE_DURATION) {
      return profile.realtime_context_cache as unknown as RealTimeContext;
    }
    
    return null;
  }, [profile?.realtime_context_cache, profile?.realtime_context_updated_at]);

  // Fetch fresh context from edge function
  const fetchContext = useCallback(async (): Promise<RealTimeContext | null> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('real-time-context', {
        body: {
          lat: location?.lat,
          lon: location?.lon,
          user_id: user?.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      });
      
      if (error) {
        console.warn('[useRealTimeContext] Error fetching context:', error);
        return null;
      }
      
      setContext(data as RealTimeContext);
      return data as RealTimeContext;
    } catch (e) {
      console.warn('[useRealTimeContext] Fetch failed:', e);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [location?.lat, location?.lon, user?.id]);

  // Get context: from cache or fetch fresh
  const getContext = useCallback(async (): Promise<RealTimeContext | null> => {
    // Try cache first
    const cached = getCachedContext();
    if (cached) {
      setContext(cached);
      return cached;
    }
    
    // Fetch fresh if no cache
    return fetchContext();
  }, [getCachedContext, fetchContext]);

  // Auto-fetch on mount if location permission is granted
  useEffect(() => {
    if (permission === 'granted' && !context && !isLoading) {
      getContext();
    }
  }, [permission, context, isLoading, getContext]);

  // Build minimal context (date/time only) - always available
  const getMinimalContext = useCallback((): RealTimeContext => {
    const now = new Date();
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 
                    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    
    const hours = now.getHours();
    let period = 'notte';
    if (hours >= 5 && hours < 12) period = 'mattina';
    else if (hours >= 12 && hours < 18) period = 'pomeriggio';
    else if (hours >= 18 && hours < 22) period = 'sera';
    
    const monthNum = now.getMonth();
    let season = 'inverno';
    if (monthNum >= 2 && monthNum <= 4) season = 'primavera';
    else if (monthNum >= 5 && monthNum <= 7) season = 'estate';
    else if (monthNum >= 8 && monthNum <= 10) season = 'autunno';
    
    return {
      datetime: {
        date: `${now.getDate()} ${months[monthNum]} ${now.getFullYear()}`,
        day: days[now.getDay()],
        time: `${hours}:${now.getMinutes().toString().padStart(2, '0')}`,
        period,
        season,
      }
    };
  }, []);

  return {
    context: context || getMinimalContext(),
    isLoading,
    getContext,
    fetchContext,
    hasLocation: !!location,
    hasFullContext: !!context?.location || !!context?.weather,
  };
};
