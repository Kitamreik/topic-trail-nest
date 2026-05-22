// Staged Firebase backend.
// Config is entered by the webmaster at runtime and stored in localStorage.
// If no config is present (or init fails), the app safely falls back to localStorage-only mode.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const CONFIG_KEY = "cookielms-firebase-config";
const ENABLED_KEY = "cookielms-firebase-enabled";

export const FIREBASE_CONFIG_FIELDS: { key: keyof FirebaseConfig; label: string; required: boolean; placeholder: string }[] = [
  { key: "apiKey", label: "API Key", required: true, placeholder: "AIzaSy..." },
  { key: "authDomain", label: "Auth Domain", required: true, placeholder: "your-project.firebaseapp.com" },
  { key: "projectId", label: "Project ID", required: true, placeholder: "your-project-id" },
  { key: "storageBucket", label: "Storage Bucket", required: true, placeholder: "your-project.appspot.com" },
  { key: "messagingSenderId", label: "Messaging Sender ID", required: true, placeholder: "1234567890" },
  { key: "appId", label: "App ID", required: true, placeholder: "1:1234567890:web:abcdef" },
  { key: "measurementId", label: "Measurement ID (optional)", required: false, placeholder: "G-XXXXXXXXXX" },
];

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirebaseConfig;
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearFirebaseConfig() {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(ENABLED_KEY);
}

export function isFirebaseEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === "true";
}

export function setFirebaseEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
}

export function isConfigComplete(config: Partial<FirebaseConfig> | null): config is FirebaseConfig {
  if (!config) return false;
  return FIREBASE_CONFIG_FIELDS
    .filter(f => f.required)
    .every(f => typeof config[f.key] === "string" && (config[f.key] as string).trim().length > 0);
}

interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let cached: FirebaseHandles | null = null;
let lastError: string | null = null;

export function getFirebase(): FirebaseHandles | null {
  if (cached) return cached;
  if (!isFirebaseEnabled()) return null;
  const config = getStoredFirebaseConfig();
  if (!isConfigComplete(config)) {
    lastError = "Firebase configuration is incomplete.";
    return null;
  }
  try {
    const app = getApps().length ? getApp() : initializeApp(config);
    cached = {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
    lastError = null;
    return cached;
  } catch (err) {
    lastError = err instanceof Error ? err.message : "Failed to initialize Firebase.";
    console.warn("[Firebase] init failed, falling back to localStorage:", err);
    cached = null;
    return null;
  }
}

export function getFirebaseStatus(): { enabled: boolean; ready: boolean; error: string | null } {
  const enabled = isFirebaseEnabled();
  if (!enabled) return { enabled: false, ready: false, error: null };
  const handles = getFirebase();
  return { enabled: true, ready: !!handles, error: lastError };
}

export function resetFirebaseCache() {
  cached = null;
  lastError = null;
}
