import type { ImportMode, ImportResult } from "@/context/LMSContext";

const HISTORY_KEY = "academic-stream-classroom-import-history";

export interface ClassroomImportRecord {
  id: string;
  timestamp: string;
  actor: string;
  semesterId: string;
  semesterName: string;
  mode: ImportMode;
  courses: { id: string; name: string }[];
  result: ImportResult;
}

export function getImportHistory(): ClassroomImportRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ClassroomImportRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordImport(entry: Omit<ClassroomImportRecord, "id" | "timestamp">) {
  const list = getImportHistory();
  list.unshift({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new CustomEvent("classroom-import-recorded"));
}

export function clearImportHistory() {
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new CustomEvent("classroom-import-recorded"));
}

export function totalChanged(r: ImportResult): number {
  return (
    r.topics.created + r.topics.updated +
    r.assignments.created + r.assignments.updated +
    r.announcements.created + r.announcements.updated
  );
}
