/**
 * Lightweight haptic feedback helpers using the Vibration API.
 * Silently no-ops on unsupported devices (iOS Safari, desktop) or when
 * the user has disabled haptics in settings.
 */

const STORAGE_KEY = "academic-stream-haptics-enabled";

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Returns the current haptics preference (default: enabled). */
export function getHapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

/** Persist the haptics preference and notify listeners. */
export function setHapticsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent("haptics-changed", { detail: enabled }));
  } catch {
    // ignore
  }
}

function vibrate(pattern: number | number[]) {
  if (!canVibrate() || !getHapticsEnabled()) return;
  navigator.vibrate(pattern);
}

/** Short tick — for swipe navigation, tab changes. ~10ms */
export function hapticTick() {
  vibrate(10);
}

/** Medium tap — for button-like interactions, threshold reached. ~20ms */
export function hapticTap() {
  vibrate(20);
}

/** Success — short double pulse. */
export function hapticSuccess() {
  vibrate([15, 40, 15]);
}

/** Warning/error — longer pulse. */
export function hapticWarn() {
  vibrate([30, 50, 30]);
}
