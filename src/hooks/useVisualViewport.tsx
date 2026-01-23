import { useState, useLayoutEffect, useRef, useCallback } from 'react';

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
 * 
 * iOS-specific fixes:
 * - Uses delayed updates (setTimeout) because iOS animates keyboard and doesn't report final height immediately
 * - Prevents scroll/bounce during keyboard transitions with window.scrollTo(0,0)
 * - Uses useLayoutEffect to prevent visual "paint" jump
 */
export function useVisualViewport(): ViewportState {
  // Store initial height ONCE (before any keyboard opens)
  const initialHeightRef = useRef<number>(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  
  // Track if we've received the first real measurement
  const hasInitializedRef = useRef(false);

  const [viewport, setViewport] = useState<ViewportState>(() => {
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    
    const height = visualViewport?.height ?? windowHeight;
    const offsetTop = visualViewport?.offsetTop ?? 0;
    
    return {
      height,
      offsetTop,
      isKeyboardOpen: false,
      keyboardHeight: 0,
      windowHeight,
    };
  });

  const updateViewport = useCallback(() => {
    const visualViewport = window.visualViewport;
    const initialHeight = initialHeightRef.current;
    
    if (!visualViewport) {
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
    
    // Consider keyboard "open" if height difference is > 100px
    const isKeyboardOpen = heightDiff > 100;
    
    // CRITICAL: Prevent iOS body scroll when keyboard opens
    if (isKeyboardOpen) {
      window.scrollTo(0, 0);
    }
    
    setViewport({
      height: currentHeight,
      offsetTop: currentOffsetTop,
      isKeyboardOpen,
      keyboardHeight: isKeyboardOpen ? heightDiff : 0,
      windowHeight: initialHeight,
    });
  }, []);

  useLayoutEffect(() => {
    const visualViewport = window.visualViewport;
    
    // Store initial height if not set
    if (!hasInitializedRef.current) {
      initialHeightRef.current = window.innerHeight;
      hasInitializedRef.current = true;
    }

    // iOS KEYBOARD FIX: Delayed updates to catch final height after animation
    const handleViewportChange = () => {
      // Immediate update for responsiveness
      updateViewport();
      
      // Delayed updates to catch iOS keyboard animation end
      // iOS keyboard animation is ~250-300ms
      setTimeout(updateViewport, 100);
      setTimeout(updateViewport, 300);
      setTimeout(updateViewport, 500); // Fail-safe for slower devices
    };

    // CRITICAL: Call immediately on mount
    updateViewport();

    if (visualViewport) {
      visualViewport.addEventListener('resize', handleViewportChange);
      visualViewport.addEventListener('scroll', handleViewportChange);

      // Also listen for focus events which trigger keyboard
      const handleFocus = () => {
        // Small delay to let keyboard start animating
        setTimeout(handleViewportChange, 50);
      };
      
      window.addEventListener('focusin', handleFocus);
      window.addEventListener('focusout', handleViewportChange);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
        visualViewport.removeEventListener('scroll', handleViewportChange);
        window.removeEventListener('focusin', handleFocus);
        window.removeEventListener('focusout', handleViewportChange);
      };
    } else {
      window.addEventListener('resize', handleViewportChange);
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, [updateViewport]);

  return viewport;
}
