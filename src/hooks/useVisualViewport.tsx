import { useState, useEffect, useCallback } from 'react';

interface ViewportState {
  height: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
  keyboardHeight: number;
  windowHeight: number;
}

/**
 * Hook to track visual viewport changes (especially for iOS keyboard)
 * Uses the VisualViewport API to detect actual visible height when keyboard opens
 * This is the "Native App" approach for iOS PWA keyboard handling
 */
export function useVisualViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(() => {
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    return {
      height: windowHeight,
      offsetTop: 0,
      isKeyboardOpen: false,
      keyboardHeight: 0,
      windowHeight,
    };
  });

  useEffect(() => {
    const visualViewport = window.visualViewport;
    
    // Store initial height at mount (before any keyboard)
    const initialHeight = window.innerHeight;

    const handleViewportChange = () => {
      if (!visualViewport) {
        // Fallback for browsers without VisualViewport API
        setViewport(prev => ({
          ...prev,
          height: window.innerHeight,
          windowHeight: window.innerHeight,
        }));
        return;
      }

      const currentHeight = visualViewport.height;
      const currentOffsetTop = visualViewport.offsetTop;
      const heightDiff = initialHeight - currentHeight - currentOffsetTop;
      
      // Consider keyboard "open" if height difference is > 100px (more sensitive)
      const isKeyboardOpen = heightDiff > 100;
      
      setViewport({
        height: currentHeight,
        offsetTop: currentOffsetTop,
        isKeyboardOpen,
        keyboardHeight: isKeyboardOpen ? heightDiff : 0,
        windowHeight: initialHeight,
      });
    };

    // Initial call
    handleViewportChange();

    if (visualViewport) {
      // Listen to viewport changes
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
      };
    } else {
      // Fallback: listen to window resize
      window.addEventListener('resize', handleViewportChange);
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  return viewport;
}
