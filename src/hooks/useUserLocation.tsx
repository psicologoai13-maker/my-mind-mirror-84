import { useState, useEffect, useCallback } from 'react';
import { useProfile } from './useProfile';

interface UserLocation {
  lat: number;
  lon: number;
  city?: string;
  region?: string;
  country?: string;
}

type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'loading';

interface UseUserLocationReturn {
  location: UserLocation | null;
  permission: PermissionStatus;
  isLoading: boolean;
  requestLocation: () => Promise<boolean>;
  clearLocation: () => void;
}

const LOCATION_STORAGE_KEY = 'aria_location';
const LOCATION_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useUserLocation = (): UseUserLocationReturn => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const { profile, updateProfile } = useProfile();

  // Check stored permission and location on mount
  useEffect(() => {
    const checkStoredData = async () => {
      // Check if user has granted permission in profile
      const profilePermission = profile?.location_permission_granted;
      
      // Check browser permission state
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          
          if (result.state === 'granted' && profilePermission) {
            setPermission('granted');
            // Try to load cached location
            const cachedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
            if (cachedLocation) {
              const { data, timestamp } = JSON.parse(cachedLocation);
              if (Date.now() - timestamp < LOCATION_CACHE_DURATION) {
                setLocation(data);
              } else {
                // Refresh location if cache expired
                refreshLocation();
              }
            } else {
              refreshLocation();
            }
          } else if (result.state === 'denied') {
            setPermission('denied');
          } else {
            setPermission('prompt');
          }
        } catch {
          // Permission API not supported, check profile
          if (profilePermission) {
            setPermission('granted');
            refreshLocation();
          } else {
            setPermission('prompt');
          }
        }
      } else {
        // Fallback for browsers without Permission API
        if (profilePermission) {
          setPermission('granted');
        } else {
          setPermission('prompt');
        }
      }
    };

    if (profile !== undefined) {
      checkStoredData();
    }
  }, [profile?.location_permission_granted]);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation: UserLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        // Try to reverse geocode for city name (using free service)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLocation.lat}&lon=${newLocation.lon}&format=json`,
            { headers: { 'Accept-Language': 'it' } }
          );
          if (response.ok) {
            const data = await response.json();
            newLocation.city = data.address?.city || data.address?.town || data.address?.village;
            newLocation.region = data.address?.state;
            newLocation.country = data.address?.country;
          }
        } catch (e) {
          console.warn('Geocoding failed:', e);
        }

        setLocation(newLocation);
        
        // Cache location
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
          data: newLocation,
          timestamp: Date.now()
        }));
      },
      (error) => {
        console.warn('Location error:', error);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: LOCATION_CACHE_DURATION }
    );
  }, []);

  const requestLocation = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      setPermission('denied');
      return false;
    }

    setIsLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation: UserLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };

          // Try to reverse geocode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${newLocation.lat}&lon=${newLocation.lon}&format=json`,
              { headers: { 'Accept-Language': 'it' } }
            );
            if (response.ok) {
              const data = await response.json();
              newLocation.city = data.address?.city || data.address?.town || data.address?.village;
              newLocation.region = data.address?.state;
              newLocation.country = data.address?.country;
            }
          } catch (e) {
            console.warn('Geocoding failed:', e);
          }

          setLocation(newLocation);
          setPermission('granted');
          setIsLoading(false);

          // Save to localStorage
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
            data: newLocation,
            timestamp: Date.now()
          }));

          // Update profile
          updateProfile.mutate({ location_permission_granted: true } as any);

          resolve(true);
        },
        (error) => {
          console.warn('Location permission denied:', error);
          setPermission('denied');
          setIsLoading(false);
          
          // Update profile
          updateProfile.mutate({ location_permission_granted: false } as any);
          
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 15000 }
      );
    });
  }, [updateProfile]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setPermission('prompt');
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    updateProfile.mutate({ location_permission_granted: false } as any);
  }, [updateProfile]);

  return {
    location,
    permission,
    isLoading,
    requestLocation,
    clearLocation
  };
};
