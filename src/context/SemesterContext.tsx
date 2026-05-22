import React, { createContext, useContext, useState } from "react";

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
}

const defaultSemesters: Semester[] = [
  { id: "sem-1", name: "Fall 2024", shortName: "FA24", startDate: "2024-08-26", endDate: "2024-12-13" },
  { id: "sem-2", name: "Spring 2025", shortName: "SP25", startDate: "2025-01-13", endDate: "2025-05-09" },
  { id: "sem-3", name: "Summer 2025", shortName: "SU25", startDate: "2025-05-19", endDate: "2025-08-08" },
  { id: "sem-4", name: "Fall 2025", shortName: "FA25", startDate: "2025-08-25", endDate: "2025-12-12" },
  { id: "sem-5", name: "Spring 2026", shortName: "SP26", startDate: "2026-01-12", endDate: "2026-05-08" },
];

const SemesterContext = createContext<SemesterContextType | null>(null);

export function SemesterProvider({ children }: { children: React.ReactNode }) {
  const [activeSemesterId, setActiveSemesterId] = useState("sem-5"); // Current semester

  const activeSemester = defaultSemesters.find(s => s.id === activeSemesterId) || defaultSemesters[4];

  return (
    <SemesterContext.Provider value={{ semesters: defaultSemesters, activeSemester, setActiveSemesterId }}>
      {children}
    </SemesterContext.Provider>
  );
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error("useSemester must be used within SemesterProvider");
  return ctx;
}
