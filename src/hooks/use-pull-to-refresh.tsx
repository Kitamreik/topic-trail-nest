import { useEffect, useRef, useState } from "react";
import { hapticTap, hapticSuccess } from "@/lib/haptics";

interface Options {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

/**
 * usePullToRefresh - Touch pull-down at top of page to trigger a refresh.
 * Returns pull distance (px) and refreshing state for a visual indicator.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, disabled = false }: Options) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const reachedThreshold = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY === 0) {
        const next = Math.min(dy * 0.5, threshold * 1.5);
        // Fire a single haptic tap when the user crosses the threshold.
        if (next >= threshold && !reachedThreshold.current) {
          reachedThreshold.current = true;
          hapticTap();
        } else if (next < threshold && reachedThreshold.current) {
          reachedThreshold.current = false;
        }
        setPull(next);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;
      reachedThreshold.current = false;
      if (pull >= threshold && !refreshing) {
        setRefreshing(true);
        try {
          await onRefresh();
          hapticSuccess();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pull, refreshing, onRefresh, threshold, disabled]);

  return { pull, refreshing, threshold };
}

interface IndicatorProps {
  pull: number;
  refreshing: boolean;
  threshold: number;
}

export function PullToRefreshIndicator({ pull, refreshing, threshold }: IndicatorProps) {
  if (pull === 0 && !refreshing) return null;
  const progress = Math.min(pull / threshold, 1);
  return (
    <div
      className="lg:hidden fixed top-0 inset-x-0 flex items-center justify-center pointer-events-none z-40 transition-transform"
      style={{ transform: `translateY(${refreshing ? 16 : Math.min(pull - 10, threshold)}px)` }}
    >
      <div className="rounded-full bg-card border border-border shadow-md p-2">
        <svg
          className={refreshing ? "animate-spin" : ""}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    </div>
  );
}
