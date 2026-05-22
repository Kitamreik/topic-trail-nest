const ACTIVITY_LOG_KEY = "academic-stream-activity-log";

export interface ActivityEntry {
  id: string;
  action: "login" | "logout" | "user_edit" | "user_delete" | "user_create" | "password_reset";
  actor: string;
  actorRole: string;
  target?: string;
  details?: string;
  timestamp: string;
}

export function getActivityLog(): ActivityEntry[] {
  try {
    const s = localStorage.getItem(ACTIVITY_LOG_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
  const log = getActivityLog();
  log.unshift({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  // Keep last 100 entries
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(log.slice(0, 100)));
}
