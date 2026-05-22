import { useRef, TouchEvent } from "react";
import { hapticTick } from "@/lib/haptics";
interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

/**
 * useSwipe - Lightweight horizontal swipe detection for touch devices.
 * Returns handlers to spread on the swipeable element.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }: SwipeHandlers) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX.current;
    const dy = endY - startY.current;
    // Ignore if vertical motion dominates (likely scroll)
    if (Math.abs(dy) > Math.abs(dx)) {
      startX.current = null;
      startY.current = null;
      return;
    }
    if (Math.abs(dx) > threshold) {
      hapticTick();
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
    startX.current = null;
    startY.current = null;
  };

  return { onTouchStart, onTouchEnd };
}
