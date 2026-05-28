import { useEffect, useMemo, useState } from "react";
import GoogleClassroomImport from "@/components/GoogleClassroomImport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cloud, History, Trash2, FolderTree, FileText, Megaphone, CheckCircle2, Search, X } from "lucide-react";
import {
  getImportHistory,
  clearImportHistory,
  totalChanged,
  type ClassroomImportRecord,
} from "@/lib/classroomImportHistory";

function StatRow({ label, icon, created, updated, skipped }: {
  label: string;
  icon: React.ReactNode;
  created: number;
  updated: number;
  skipped: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className="font-mono">
        <span className="text-emerald-600">+{created}</span>{" "}
        <span className="text-blue-600">~{updated}</span>{" "}
        <span className="text-muted-foreground">·{skipped}</span>
      </span>
    </div>
  );
}

export default function ClassroomImports() {
  const [history, setHistory] = useState<ClassroomImportRecord[]>(() => getImportHistory());
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");

  useEffect(() => {
    const refresh = () => setHistory(getImportHistory());
    window.addEventListener("classroom-import-recorded", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("classroom-import-recorded", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const uniqueCourses = useMemo(() => {
    const map = new Map<string, string>();
    history.forEach(h => h.courses.forEach(c => map.set(c.id, c.name)));
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [history]);

  const uniqueSemesters = useMemo(() => {
    const s = new Set(history.map(h => h.semesterName));
    return Array.from(s).sort();
  }, [history]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter(rec => {
      if (modeFilter !== "all" && rec.mode !== modeFilter) return false;
      if (semesterFilter !== "all" && rec.semesterName !== semesterFilter) return false;
      if (courseFilter !== "all" && !rec.courses.some(c => c.id === courseFilter)) return false;
      if (q) {
        const hay = [
          rec.actor,
          rec.semesterName,
          rec.mode,
          ...rec.courses.map(c => c.name),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [history, search, courseFilter, semesterFilter, modeFilter]);

  const hasActiveFilter = search.trim() !== "" || courseFilter !== "all" || semesterFilter !== "all" || modeFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setCourseFilter("all");
    setSemesterFilter("all");
    setModeFilter("all");
  };


  const totalImports = history.length;
  const totalItems = history.reduce((sum, h) => sum + totalChanged(h.result), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <header className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Cloud className="h-6 w-6 text-primary" /> Google Classroom Imports
        </h1>
        <p className="text-sm text-muted-foreground">
          Pull courses, coursework and announcements from Google Classroom into the active semester.
          Pick which items to include, compare merge vs overwrite, and track every import.
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total imports</p>
          <p className="text-2xl font-bold mt-0.5">{totalImports}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Items written</p>
          <p className="text-2xl font-bold mt-0.5">{totalItems}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Last import</p>
          <p className="text-sm font-medium mt-1 truncate">
            {history[0] ? new Date(history[0].timestamp).toLocaleString() : "Never"}
          </p>
        </CardContent></Card>
      </div>

      <GoogleClassroomImport />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Import history
          </CardTitle>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { clearImportHistory(); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No imports yet. Use the importer above to bring your first course in.
            </p>
          ) : (
            history.map(rec => (
              <div key={rec.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-semibold">
                        {totalChanged(rec.result)} item{totalChanged(rec.result) === 1 ? "" : "s"} written
                      </span>
                      <Badge variant={rec.mode === "overwrite" ? "destructive" : "secondary"} className="text-[10px] capitalize">
                        {rec.mode}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{rec.semesterName}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(rec.timestamp).toLocaleString()} · by {rec.actor}
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <StatRow label="Topics" icon={<FolderTree className="h-3 w-3" />}
                    created={rec.result.topics.created} updated={rec.result.topics.updated} skipped={rec.result.topics.skipped} />
                  <StatRow label="Assignments" icon={<FileText className="h-3 w-3" />}
                    created={rec.result.assignments.created} updated={rec.result.assignments.updated} skipped={rec.result.assignments.skipped} />
                  <StatRow label="Announcements" icon={<Megaphone className="h-3 w-3" />}
                    created={rec.result.announcements.created} updated={rec.result.announcements.updated} skipped={rec.result.announcements.skipped} />
                </div>
                {rec.courses.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 border-t">
                    {rec.courses.map(c => (
                      <Badge key={c.id} variant="outline" className="text-[10px] font-normal">{c.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
