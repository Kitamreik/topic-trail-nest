// Real Google Classroom integration via Google Identity Services (GIS) + Classroom REST API.
// Runs entirely in the browser — the webmaster provides their own OAuth Client ID
// (created in Google Cloud Console) which is persisted to localStorage.
//
// Docs:
//   - GIS token client:    https://developers.google.com/identity/oauth2/web/guides/use-token-model
//   - Classroom REST API:  https://developers.google.com/classroom/reference/rest

const CLIENT_ID_KEY = "academic-stream-gclassroom-client-id";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
  "https://www.googleapis.com/auth/classroom.announcements.readonly",
  "https://www.googleapis.com/auth/classroom.topics.readonly",
].join(" ");

export function getClientId(): string {
  return localStorage.getItem(CLIENT_ID_KEY) ?? "";
}
export function setClientId(id: string) {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

// Cached access token (in-memory only; not persisted).
let cachedToken: { token: string; expiresAt: number } | null = null;

export function clearCachedToken() {
  cachedToken = null;
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services. Check your network or ad-blocker."));
    document.head.appendChild(s);
  });
}

/**
 * Friendly error decoder. Turns raw Google error strings into actionable guidance.
 */
function friendlyError(raw: string, status?: number): string {
  const s = raw.toLowerCase();
  if (s.includes("popup_closed") || s.includes("cancelled") || s.includes("canceled")) {
    return "Sign-in was cancelled. Click 'Sign in with Google' again to retry.";
  }
  if (s.includes("popup_blocked") || s.includes("popup blocked")) {
    return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";
  }
  if (s.includes("idpiframe") || s.includes("origin")) {
    return `This site's origin (${location.origin}) is not in the OAuth client's "Authorized JavaScript origins" list. Add it in Google Cloud Console → Credentials.`;
  }
  if (s.includes("invalid_client") || s.includes("client id")) {
    return "Invalid OAuth Client ID. Double-check the value copied from Google Cloud Console (it must end in .apps.googleusercontent.com).";
  }
  if (s.includes("access_denied") || s.includes("not granted") || s.includes("consent")) {
    return "You declined one of the requested Classroom scopes. Click 'Sign in' again and approve all permissions.";
  }
  if (status === 401) return "Your Google session expired. Re-authenticating…";
  if (status === 403) {
    if (s.includes("classroom api has not been used") || s.includes("disabled")) {
      return "The Google Classroom API is not enabled on this Google Cloud project. Enable it in Cloud Console → APIs & Services → Library.";
    }
    return "Google refused this request (403). Make sure your account has access to the course and that all four Classroom scopes were granted.";
  }
  if (status === 404) return "Course or resource not found. It may have been archived or removed.";
  if (status === 429) return "Google rate-limited the request. Waiting a moment and retrying…";
  if (status && status >= 500) return `Google Classroom is having trouble (${status}). Retrying…`;
  return raw.length > 240 ? raw.slice(0, 240) + "…" : raw;
}

export class ClassroomError extends Error {
  status?: number;
  hint: string;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.hint = friendlyError(message, status);
  }
}

export async function requestAccessToken(forceConsent = false): Promise<string> {
  if (!forceConsent && cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;

  const clientId = getClientId();
  if (!clientId) throw new ClassroomError("Google OAuth Client ID is not configured.");

  try {
    await loadGis();
  } catch (e: any) {
    throw new ClassroomError(e?.message || "Failed to load Google Identity Services.");
  }
  const google = (window as any).google;

  return new Promise<string>((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: CLASSROOM_SCOPES,
        callback: (resp: any) => {
          if (resp.error) return reject(new ClassroomError(resp.error_description || resp.error));
          if (!resp.access_token) return reject(new ClassroomError("No access token returned by Google."));
          const expiresIn = Number(resp.expires_in ?? 3600) * 1000;
          cachedToken = { token: resp.access_token, expiresAt: Date.now() + expiresIn };
          resolve(resp.access_token);
        },
        error_callback: (err: any) => reject(new ClassroomError(err?.message || err?.type || "Google sign-in failed.")),
      });
      client.requestAccessToken({ prompt: forceConsent ? "consent" : "" });
    } catch (e: any) {
      reject(new ClassroomError(e?.message || "Failed to initialize Google OAuth client."));
    }
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch wrapper with:
 *  - automatic single retry on 401 by re-requesting the access token
 *  - exponential backoff (3 tries) on 429 / 5xx
 *  - rich ClassroomError on failure
 */
async function gapi<T>(path: string, tokenRef: { token: string }): Promise<T> {
  let lastErr: ClassroomError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(`https://classroom.googleapis.com/v1${path}`, {
        headers: { Authorization: `Bearer ${tokenRef.token}` },
      });
    } catch (networkErr: any) {
      lastErr = new ClassroomError(networkErr?.message || "Network error contacting Google Classroom.");
      await sleep(400 * Math.pow(2, attempt));
      continue;
    }

    if (res.ok) return res.json() as Promise<T>;

    const text = await res.text().catch(() => "");
    // 401 — token expired or revoked. Refresh once, then retry.
    if (res.status === 401 && attempt === 0) {
      clearCachedToken();
      try {
        tokenRef.token = await requestAccessToken();
        continue;
      } catch (e: any) {
        throw new ClassroomError(e?.message || "Re-authentication failed.", 401);
      }
    }
    // 429 / 5xx — back off and retry.
    if (res.status === 429 || res.status >= 500) {
      lastErr = new ClassroomError(text || res.statusText, res.status);
      await sleep(500 * Math.pow(2, attempt));
      continue;
    }
    // Other 4xx — non-retryable.
    throw new ClassroomError(text || res.statusText, res.status);
  }
  throw lastErr ?? new ClassroomError("Google Classroom request failed after retries.");
}

export interface GCourse { id: string; name: string; section?: string; descriptionHeading?: string; description?: string; }
export interface GCourseWork {
  id: string; courseId: string; title: string; description?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  maxPoints?: number; alternateLink?: string; workType?: string; topicId?: string;
}
export interface GAnnouncement { id: string; courseId: string; text: string; creationTime: string; alternateLink?: string; }
export interface GTopic { topicId: string; courseId: string; name: string; }

export async function listCourses(token: string): Promise<GCourse[]> {
  const data = await gapi<{ courses?: GCourse[] }>("/courses?courseStates=ACTIVE&pageSize=100", { token });
  return data.courses ?? [];
}
export async function listCourseWork(token: string, courseId: string): Promise<GCourseWork[]> {
  const data = await gapi<{ courseWork?: GCourseWork[] }>(
    `/courses/${courseId}/courseWork?pageSize=100`, { token },
  );
  return data.courseWork ?? [];
}
export async function listAnnouncements(token: string, courseId: string): Promise<GAnnouncement[]> {
  const data = await gapi<{ announcements?: GAnnouncement[] }>(
    `/courses/${courseId}/announcements?pageSize=100`, { token },
  );
  return data.announcements ?? [];
}
export async function listTopics(token: string, courseId: string): Promise<GTopic[]> {
  const data = await gapi<{ topic?: GTopic[] }>(`/courses/${courseId}/topics?pageSize=100`, { token });
  return data.topic ?? [];
}

export function dueDateToIso(work: GCourseWork): string {
  if (!work.dueDate) return new Date(Date.now() + 14 * 86400000).toISOString();
  const { year, month, day } = work.dueDate;
  const h = work.dueTime?.hours ?? 23;
  const m = work.dueTime?.minutes ?? 59;
  return new Date(Date.UTC(year, month - 1, day, h, m)).toISOString();
}
