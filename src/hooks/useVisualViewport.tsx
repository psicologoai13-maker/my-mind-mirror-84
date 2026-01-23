import { useState, useEffect } from 'react';

interface ViewportState {
  height: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

/**
 * Hook to track visual viewport changes (especially for iOS keyboard)
 * Uses the VisualViewport API to detect actual visible height when keyboard opens
 */
export function useVisualViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    offsetTop: 0,
    isKeyboardOpen: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const visualViewport = window.visualViewport;
    
    if (!visualViewport) {
      // Fallback for browsers without VisualViewport API
      return;
    }

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = visualViewport.height;
      const currentOffsetTop = visualViewport.offsetTop;
      const heightDiff = initialHeight - currentHeight;
      
      // Consider keyboard "open" if height difference is > 150px
      const isKeyboardOpen = heightDiff > 150;
      
      setViewport({
        height: currentHeight,
        offsetTop: currentOffsetTop,
        isKeyboardOpen,
        keyboardHeight: isKeyboardOpen ? heightDiff : 0,
      });
    };

    // Initial call
    handleResize();

    // Listen to viewport changes
    visualViewport.addEventListener('resize', handleResize);
    visualViewport.addEventListener('scroll', handleResize);

    return () => {
      visualViewport.removeEventListener('resize', handleResize);
      visualViewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return viewport;
}
