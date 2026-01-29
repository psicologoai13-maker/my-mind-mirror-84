import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

interface HapticConfig {
  pattern: number[];
  intensity?: number;
}

const HAPTIC_PATTERNS: Record<HapticType, HapticConfig> = {
  light: { pattern: [10] },
  medium: { pattern: [20] },
  heavy: { pattern: [30] },
  success: { pattern: [10, 50, 20] },
  warning: { pattern: [20, 30, 20] },
  error: { pattern: [30, 50, 30, 50, 30] },
  selection: { pattern: [5] },
};

export const useHapticFeedback = () => {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported) return;

    try {
      const config = HAPTIC_PATTERNS[type];
      navigator.vibrate(config.pattern);
    } catch (error) {
      // Silently fail if vibration not supported
      console.debug('Haptic feedback not available');
    }
  }, [isSupported]);

  const triggerPattern = useCallback((pattern: number[]) => {
    if (!isSupported) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    
    try {
      navigator.vibrate(0);
    } catch (error) {
      // Silently fail
    }
  }, [isSupported]);

  return {
    isSupported,
    trigger,
    triggerPattern,
    stop,
    // Convenience methods
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
  };
};

export default useHapticFeedback;
