// Webmaster-controlled toggle for showing the demo-account quick-login buttons
// on the public login page.
const KEY = "cookielms-demo-accounts-enabled";

export function getDemoAccountsEnabled(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === null) return true; // default: enabled
    return v === "true";
  } catch {
    return true;
  }
}

export function setDemoAccountsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(KEY, String(enabled));
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new CustomEvent("demo-accounts-changed", { detail: enabled }));
  } catch {}
}
