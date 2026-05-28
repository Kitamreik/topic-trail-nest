import React, { createContext, useContext, useEffect, useState } from "react";

export interface Semester {
  id: string;
  name: string;
  shortName: string;
  startDate: string;
  endDate: string;
}

interface SemesterContextType {
  semesters: Semester[];
  activeSemester: Semester;
  setActiveSemesterId: (id: string) => void;
  updateSemesterName: (id: string, name: string) => { success: boolean; error?: string };
}

const defaultSemesters: Semester[] = [
  { id: "sem-1", name: "Fall 2024", shortName: "FA24", startDate: "2024-08-26", endDate: "2024-12-13" },
  { id: "sem-2", name: "Spring 2025", shortName: "SP25", startDate: "2025-01-13", endDate: "2025-05-09" },
  { id: "sem-3", name: "Summer 2025", shortName: "SU25", startDate: "2025-05-19", endDate: "2025-08-08" },
  { id: "sem-4", name: "Fall 2025", shortName: "FA25", startDate: "2025-08-25", endDate: "2025-12-12" },
  { id: "sem-5", name: "Spring 2026", shortName: "SP26", startDate: "2026-01-12", endDate: "2026-05-08" },
];

const SEMESTERS_KEY = "cookielms-semesters";
const ACTIVE_KEY = "cookielms-active-semester";

const SemesterContext = createContext<SemesterContextType | null>(null);

function loadSemesters(): Semester[] {
  try {
    const raw = localStorage.getItem(SEMESTERS_KEY);
    if (!raw) return defaultSemesters;
    const parsed = JSON.parse(raw) as Semester[];
    // Merge: keep all defaults, override names from storage by id
    return defaultSemesters.map(d => {
      const match = parsed.find(p => p.id === d.id);
      return match ? { ...d, name: match.name } : d;
    });
  } catch {
    return defaultSemesters;
  }
}

export function SemesterProvider({ children }: { children: React.ReactNode }) {
  const [semesters, setSemesters] = useState<Semester[]>(() => loadSemesters());
  const [activeSemesterId, setActiveSemesterIdState] = useState<string>(() => {
    try { return localStorage.getItem(ACTIVE_KEY) || "sem-5"; } catch { return "sem-5"; }
  });

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_KEY, activeSemesterId); } catch {}
  }, [activeSemesterId]);

  useEffect(() => {
    const sync = () => setSemesters(loadSemesters());
    window.addEventListener("semesters-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("semesters-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const activeSemester = semesters.find(s => s.id === activeSemesterId) || semesters[semesters.length - 1];

  const updateSemesterName = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "Name cannot be empty" };
    if (trimmed.length > 60) return { success: false, error: "Name is too long" };
    const next = semesters.map(s => s.id === id ? { ...s, name: trimmed } : s);
    setSemesters(next);
    try {
      localStorage.setItem(SEMESTERS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("semesters-changed"));
    } catch {}
    return { success: true };
  };

  const setActiveSemesterId = (id: string) => setActiveSemesterIdState(id);

  return (
    <SemesterContext.Provider value={{ semesters, activeSemester, setActiveSemesterId, updateSemesterName }}>
      {children}
    </SemesterContext.Provider>
  );
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester must be used within SemesterProvider");
  return ctx;
}
