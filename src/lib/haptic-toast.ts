import { toast } from "sonner";
import { hapticSuccess, hapticWarn } from "@/lib/haptics";

let installed = false;

/**
 * Patches the sonner toast helpers so success/error toasts also trigger
 * a haptic pulse on supported devices (when haptics are enabled).
 *
 * Safe to call multiple times — installs only once.
 */
export function installHapticToast() {
  if (installed) return;
  installed = true;

  const originalSuccess = toast.success.bind(toast);
  const originalError = toast.error.bind(toast);

  toast.success = ((...args: Parameters<typeof originalSuccess>) => {
    hapticSuccess();
    return originalSuccess(...args);
  }) as typeof toast.success;

  toast.error = ((...args: Parameters<typeof originalError>) => {
    hapticWarn();
    return originalError(...args);
  }) as typeof toast.error;
}
