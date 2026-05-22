import { useEffect, useMemo, useState } from "react";
import { useLMS, type ImportPlan, type ImportMode, type ImportResult, type ImportDiff } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import {
  getClientId, setClientId, requestAccessToken, clearCachedToken,
  listCourses, listCourseWork, listAnnouncements, listTopics, dueDateToIso,
  ClassroomError,
  type GCourse, type GCourseWork, type GAnnouncement, type GTopic,
} from "@/lib/googleClassroom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Cloud, Download, RefreshCw, ExternalLink, CheckCircle2, FolderTree, FileText,
  Megaphone, ArrowLeft, AlertTriangle, Wand2,
} from "lucide-react";
import { toast } from "sonner";

type Step = "auth" | "select" | "preview" | "done";

const FALLBACK_TOPIC_KEY = "__fallback__";

interface RawCourseData {
  coursework: GCourseWork[];
  announcements: GAnnouncement[];
  topics: GTopic[];
}

interface ProgressState {
  pct: number;
  label: string;
}

function buildPlan(
  course: GCourse,
  semesterId: string,
  coursework: GCourseWork[],
  anns: GAnnouncement[],
  gTopics: GTopic[],
  selected: { topics: Set<string>; assignments: Set<string>; announcements: Set<string> },
): ImportPlan {
  const topicKey = (id: string) => `gclassroom:topic:${course.id}:${id}`;
  const fallbackExternalId = `gclassroom:topic:${course.id}:__course__`;

  const topicSourceKeyById = new Map<string, string>();
  // Filter topics to user selection
  const includedGTopics = gTopics.filter(t => selected.topics.has(t.topicId));
  const topics: ImportPlan["topics"] = includedGTopics.map(t => {
    const key = topicKey(t.topicId);
    topicSourceKeyById.set(t.topicId, key);
    return {
      sourceKey: key,
      title: t.name,
      description: `Imported from Google Classroom course "${course.name}".`,
      externalId: key,
    };
  });

  const includedCoursework = coursework.filter(w => selected.assignments.has(w.id));
  const needFallback = includedCoursework.some(w => !w.topicId || !topicSourceKeyById.has(w.topicId));
  if (needFallback) {
    topics.unshift({
      sourceKey: FALLBACK_TOPIC_KEY,
      title: course.name + (course.section ? ` — ${course.section}` : ""),
      description: course.description || course.descriptionHeading || "Imported from Google Classroom.",
      externalId: fallbackExternalId,
    });
  }

  const assignments: ImportPlan["assignments"] = includedCoursework.map(w => ({
    sourceKey: `gclassroom:work:${course.id}:${w.id}`,
    topicSourceKey: w.topicId && topicSourceKeyById.has(w.topicId) ? topicSourceKeyById.get(w.topicId)! : FALLBACK_TOPIC_KEY,
    title: w.title,
    dueDate: dueDateToIso(w),
    maxScore: w.maxPoints ?? 100,
    externalId: `gclassroom:work:${course.id}:${w.id}`,
  }));

  const announcements: ImportPlan["announcements"] = anns
    .filter(a => selected.announcements.has(a.id))
    .map(a => ({
      sourceKey: `gclassroom:ann:${course.id}:${a.id}`,
      title: a.text.split("\n")[0].slice(0, 80) || "Classroom announcement",
      body: a.text,
      externalId: `gclassroom:ann:${course.id}:${a.id}`,
    }));

  return {
    semesterId,
    topics,
    assignments,
    announcements,
    fallbackTopicSourceKey: FALLBACK_TOPIC_KEY,
  };
}

const STATUS_STYLES: Record<string, string> = {
  create: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  update: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  skip: "bg-muted text-muted-foreground border-border",
};

export default function GoogleClassroomImport() {
  const { bulkImport, previewImport } = useLMS();
  const { semesters, activeSemester } = useSemester();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("auth");
  const [clientIdInput, setClientIdInput] = useState(getClientId());
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<GCourse[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [activePreviewCourseId, setActivePreviewCourseId] = useState<string>("");
  const [courseData, setCourseData] = useState<Record<string, RawCourseData>>({});
  const [targetSemesterId, setTargetSemesterId] = useState<string>(activeSemester.id);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ pct: 0, label: "" });
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [error, setError] = useState<ClassroomError | null>(null);

  // Per-course selection of items to include
  const [selectedTopics, setSelectedTopics] = useState<Record<string, Set<string>>>({});
  const [selectedAssignments, setSelectedAssignments] = useState<Record<string, Set<string>>>({});
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<Record<string, Set<string>>>({});

  useEffect(() => { if (open) setClientIdInput(getClientId()); }, [open]);

  const reset = () => {
    setStep(token ? "select" : "auth");
    setLastImport(null);
    setError(null);
    setProgress({ pct: 0, label: "" });
  };

  const saveClientId = () => {
    if (!clientIdInput.trim()) { toast.error("Enter a Google OAuth Client ID first."); return; }
    setClientId(clientIdInput.trim());
    toast.success("Client ID saved.");
  };

  // Centralized error handler — surfaces ClassroomError.hint and auto-retries 401.
  const runWithErrorHandling = async <T,>(fn: () => Promise<T>, retried = false): Promise<T | null> => {
    try {
      setError(null);
      return await fn();
    } catch (e: any) {
      const err = e instanceof ClassroomError ? e : new ClassroomError(e?.message || String(e));
      // Auto-resolve: 401 means token expired; clear cache and retry once.
      if (err.status === 401 && !retried) {
        clearCachedToken();
        try { await requestAccessToken(); } catch {}
        return runWithErrorHandling(fn, true);
      }
      setError(err);
      toast.error(err.hint);
      return null;
    }
  };

  const connect = async () => {
    setLoading(true);
    setProgress({ pct: 10, label: "Authenticating with Google…" });
    const result = await runWithErrorHandling(async () => {
      const t = await requestAccessToken();
      setToken(t);
      setProgress({ pct: 50, label: "Loading your courses…" });
      const list = await listCourses(t);
      return list;
    });
    if (result) {
      setCourses(result);
      setProgress({ pct: 100, label: "Done" });
      if (result.length === 0) toast.warning("No active courses found on this Google account.");
      else { toast.success(`Connected — found ${result.length} course${result.length === 1 ? "" : "s"}.`); setStep("select"); }
    }
    setLoading(false);
    setTimeout(() => setProgress({ pct: 0, label: "" }), 600);
  };

  const fetchSelectedCourses = async () => {
    if (!token || selectedCourseIds.size === 0) return;
    setLoading(true);
    const ids = Array.from(selectedCourseIds);
    const data: Record<string, RawCourseData> = {};
    const result = await runWithErrorHandling(async () => {
      const total = ids.length * 3; // 3 calls per course
      let done = 0;
      const bump = (label: string) => {
        done++;
        setProgress({ pct: Math.round((done / total) * 100), label });
      };
      for (const id of ids) {
        const course = courses.find(c => c.id === id);
        const label = course?.name ?? id;
        const [coursework, anns, gTopics] = await Promise.all([
          listCourseWork(token, id).finally(() => bump(`${label} — coursework`)),
          listAnnouncements(token, id).finally(() => bump(`${label} — announcements`)),
          listTopics(token, id).finally(() => bump(`${label} — topics`)),
        ]);
        data[id] = { coursework, announcements: anns, topics: gTopics };
      }
      return data;
    });
    if (result) {
      setCourseData(result);
      // Default: include everything
      const t: Record<string, Set<string>> = {};
      const a: Record<string, Set<string>> = {};
      const n: Record<string, Set<string>> = {};
      for (const id of ids) {
        t[id] = new Set(result[id].topics.map(x => x.topicId));
        a[id] = new Set(result[id].coursework.map(x => x.id));
        n[id] = new Set(result[id].announcements.map(x => x.id));
      }
      setSelectedTopics(t);
      setSelectedAssignments(a);
      setSelectedAnnouncements(n);
      setActivePreviewCourseId(ids[0]);
      setStep("preview");
    }
    setLoading(false);
    setTimeout(() => setProgress({ pct: 0, label: "" }), 600);
  };

  // Build a plan per selected course (combined). We commit course-by-course so each gets
  // its own fallback topic etc.
  const plansByCourse = useMemo(() => {
    const map: Record<string, ImportPlan> = {};
    for (const id of selectedCourseIds) {
      const course = courses.find(c => c.id === id);
      const data = courseData[id];
      if (!course || !data) continue;
      map[id] = buildPlan(course, targetSemesterId, data.coursework, data.announcements, data.topics, {
        topics: selectedTopics[id] ?? new Set(),
        assignments: selectedAssignments[id] ?? new Set(),
        announcements: selectedAnnouncements[id] ?? new Set(),
      });
    }
    return map;
  }, [selectedCourseIds, courses, courseData, targetSemesterId, selectedTopics, selectedAssignments, selectedAnnouncements]);

  // Combined diff across all selected courses for whichever mode is active
  const combinedDiff = useMemo<ImportDiff | null>(() => {
    const ids = Array.from(selectedCourseIds);
    if (ids.length === 0) return null;
    const merged: ImportDiff = {
      topics: [], assignments: [], announcements: [],
      totals: {
        topics: { created: 0, updated: 0, skipped: 0 },
        assignments: { created: 0, updated: 0, skipped: 0 },
        announcements: { created: 0, updated: 0, skipped: 0 },
      },
    };
    for (const id of ids) {
      const plan = plansByCourse[id];
      if (!plan) continue;
      const d = previewImport(plan, mode);
      merged.topics.push(...d.topics);
      merged.assignments.push(...d.assignments);
      merged.announcements.push(...d.announcements);
      (["topics", "assignments", "announcements"] as const).forEach(k => {
        merged.totals[k].created += d.totals[k].created;
        merged.totals[k].updated += d.totals[k].updated;
        merged.totals[k].skipped += d.totals[k].skipped;
      });
    }
    return merged;
  }, [selectedCourseIds, plansByCourse, mode, previewImport]);

  // Also compute the diff for the OTHER mode for side-by-side comparison.
  const otherModeDiff = useMemo<ImportDiff | null>(() => {
    const ids = Array.from(selectedCourseIds);
    if (ids.length === 0) return null;
    const otherMode: ImportMode = mode === "merge" ? "overwrite" : "merge";
    const merged: ImportDiff = {
      topics: [], assignments: [], announcements: [],
      totals: {
        topics: { created: 0, updated: 0, skipped: 0 },
        assignments: { created: 0, updated: 0, skipped: 0 },
        announcements: { created: 0, updated: 0, skipped: 0 },
      },
    };
    for (const id of ids) {
      const plan = plansByCourse[id];
      if (!plan) continue;
      const d = previewImport(plan, otherMode);
      (["topics", "assignments", "announcements"] as const).forEach(k => {
        merged.totals[k].created += d.totals[k].created;
        merged.totals[k].updated += d.totals[k].updated;
        merged.totals[k].skipped += d.totals[k].skipped;
      });
    }
    return merged;
  }, [selectedCourseIds, plansByCourse, mode, previewImport]);

  const commit = async () => {
    setLoading(true);
    const totals: ImportResult = {
      topics: { created: 0, updated: 0, skipped: 0 },
      assignments: { created: 0, updated: 0, skipped: 0 },
      announcements: { created: 0, updated: 0, skipped: 0 },
    };
    const result = await runWithErrorHandling(async () => {
      const ids = Array.from(selectedCourseIds);
      let done = 0;
      for (const id of ids) {
        const plan = plansByCourse[id];
        if (!plan) continue;
        const r = bulkImport(plan, mode);
        (["topics", "assignments", "announcements"] as const).forEach(k => {
          totals[k].created += r[k].created;
          totals[k].updated += r[k].updated;
          totals[k].skipped += r[k].skipped;
        });
        done++;
        setProgress({ pct: Math.round((done / ids.length) * 100), label: `Committed ${done}/${ids.length}` });
      }
      return totals;
    });
    if (result) {
      setLastImport(result);
      setStep("done");
      const changed = result.topics.created + result.topics.updated +
        result.assignments.created + result.assignments.updated +
        result.announcements.created + result.announcements.updated;
      toast.success(`Import complete — ${changed} item${changed === 1 ? "" : "s"} written.`);
    }
    setLoading(false);
    setTimeout(() => setProgress({ pct: 0, label: "" }), 600);
  };

  // Selection helpers
  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleInSet = (
    map: Record<string, Set<string>>,
    setter: (m: Record<string, Set<string>>) => void,
    courseId: string, itemId: string,
  ) => {
    const cur = new Set(map[courseId] ?? []);
    cur.has(itemId) ? cur.delete(itemId) : cur.add(itemId);
    setter({ ...map, [courseId]: cur });
  };
  const setAllInCourse = (
    map: Record<string, Set<string>>,
    setter: (m: Record<string, Set<string>>) => void,
    courseId: string, ids: string[], on: boolean,
  ) => {
    setter({ ...map, [courseId]: on ? new Set(ids) : new Set() });
  };

  const activeCourse = courses.find(c => c.id === activePreviewCourseId);
  const activeData = courseData[activePreviewCourseId];

  return (
    <>
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Cloud className="h-5 w-5" /></div>
            <div>
              <h3 className="font-semibold text-sm">Google Classroom Import</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                Pull real courses, coursework and announcements from Google Classroom. Pick exactly which items to import, preview the diff for both merge and overwrite, and commit.
              </p>
            </div>
          </div>
          <Button onClick={() => { setOpen(true); reset(); }}>
            <Download className="h-4 w-4 mr-1.5" /> Open Importer
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Import from Google Classroom</DialogTitle>
            <DialogDescription>
              Uses your own OAuth Client ID — data flows only between your browser and Google.
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar — visible whenever something is in flight */}
          {(loading || progress.pct > 0) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate">{progress.label || "Working…"}</span>
                <span>{progress.pct}%</span>
              </div>
              <Progress value={progress.pct} className="h-1.5" />
            </div>
          )}

          {/* Error surface with auto-troubleshoot hint */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{error.status ? `Google error ${error.status}` : "Something went wrong"}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-xs">{error.hint}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={async () => {
                    clearCachedToken();
                    await runWithErrorHandling(async () => { const t = await requestAccessToken(true); setToken(t); });
                  }}>
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Re-authenticate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setError(null)}>Dismiss</Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {step === "auth" && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs">1. Google OAuth Client ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="123-abc.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={e => setClientIdInput(e.target.value)}
                  />
                  <Button variant="outline" onClick={saveClientId}>Save</Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Create one in <a className="underline inline-flex items-center gap-0.5" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console <ExternalLink className="h-3 w-3" /></a>:
                  enable the <em>Google Classroom API</em>, create an <em>OAuth 2.0 Client ID</em> of type <em>Web application</em>, and add this site's origin (<code className="text-[10px] bg-muted px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}</code>) to <em>Authorized JavaScript origins</em>.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">2. Connect</Label>
                <Button onClick={connect} disabled={loading || !clientIdInput.trim()} className="w-full">
                  {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Cloud className="h-4 w-4 mr-1.5" />}
                  Sign in with Google
                </Button>
              </div>
            </div>
          )}

          {step === "select" && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-xs">Target semester</Label>
                <Select value={targetSemesterId} onValueChange={setTargetSemesterId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {semesters.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Courses to import ({selectedCourseIds.size} selected)</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedCourseIds(new Set(courses.map(c => c.id)))}>All</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedCourseIds(new Set())}>None</Button>
                  </div>
                </div>
                <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                  {courses.length === 0 && (
                    <div className="p-4 text-xs text-muted-foreground">No active courses found.</div>
                  )}
                  {courses.map(c => (
                    <label key={c.id} className="flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/40">
                      <Checkbox
                        checked={selectedCourseIds.has(c.id)}
                        onCheckedChange={() => toggleCourse(c.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{c.name}</div>
                        {c.section && <div className="text-[11px] text-muted-foreground truncate">{c.section}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Button variant="outline" onClick={connect} disabled={loading} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh course list
              </Button>
            </div>
          )}

          {step === "preview" && combinedDiff && otherModeDiff && (
            <div className="space-y-4 py-2">
              {/* Course tabs */}
              {selectedCourseIds.size > 1 && (
                <div className="flex flex-wrap gap-1.5 border-b pb-2">
                  {Array.from(selectedCourseIds).map(id => {
                    const c = courses.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => setActivePreviewCourseId(id)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          activePreviewCourseId === id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selection panel for the active course */}
              {activeCourse && activeData && (
                <div className="space-y-3">
                  <SelectionGroup
                    label="Topics"
                    icon={<FolderTree className="h-3.5 w-3.5 text-primary" />}
                    items={activeData.topics.map(t => ({ id: t.topicId, label: t.name }))}
                    selected={selectedTopics[activeCourse.id] ?? new Set()}
                    onToggle={(id) => toggleInSet(selectedTopics, setSelectedTopics, activeCourse.id, id)}
                    onAll={(on) => setAllInCourse(selectedTopics, setSelectedTopics, activeCourse.id, activeData.topics.map(t => t.topicId), on)}
                  />
                  <SelectionGroup
                    label="Assignments"
                    icon={<FileText className="h-3.5 w-3.5 text-primary" />}
                    items={activeData.coursework.map(w => ({
                      id: w.id,
                      label: w.title,
                      sub: w.dueDate ? `due ${w.dueDate.month}/${w.dueDate.day}/${w.dueDate.year}` : "no due date",
                    }))}
                    selected={selectedAssignments[activeCourse.id] ?? new Set()}
                    onToggle={(id) => toggleInSet(selectedAssignments, setSelectedAssignments, activeCourse.id, id)}
                    onAll={(on) => setAllInCourse(selectedAssignments, setSelectedAssignments, activeCourse.id, activeData.coursework.map(w => w.id), on)}
                  />
                  <SelectionGroup
                    label="Announcements"
                    icon={<Megaphone className="h-3.5 w-3.5 text-primary" />}
                    items={activeData.announcements.map(a => ({
                      id: a.id,
                      label: a.text.split("\n")[0].slice(0, 80) || "Untitled",
                    }))}
                    selected={selectedAnnouncements[activeCourse.id] ?? new Set()}
                    onToggle={(id) => toggleInSet(selectedAnnouncements, setSelectedAnnouncements, activeCourse.id, id)}
                    onAll={(on) => setAllInCourse(selectedAnnouncements, setSelectedAnnouncements, activeCourse.id, activeData.announcements.map(a => a.id), on)}
                  />
                </div>
              )}

              {/* Mode selector */}
              <div className="space-y-2">
                <Label className="text-xs">Conflict strategy</Label>
                <RadioGroup value={mode} onValueChange={v => setMode(v as ImportMode)} className="gap-2">
                  <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem value="merge" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Merge (update existing)</div>
                      <div className="text-[11px] text-muted-foreground">Matches items previously imported by Google ID and updates them. Nothing is deleted.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem value="overwrite" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Overwrite (replace re-imported items)</div>
                      <div className="text-[11px] text-muted-foreground">Removes matching previously-imported items (and their grades) before inserting fresh copies.</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Side-by-side totals: merge vs overwrite */}
              <div className="grid grid-cols-2 gap-3">
                <DiffTotalsCard title="Merge" diff={mode === "merge" ? combinedDiff : otherModeDiff} active={mode === "merge"} />
                <DiffTotalsCard title="Overwrite" diff={mode === "overwrite" ? combinedDiff : otherModeDiff} active={mode === "overwrite"} />
              </div>

              {/* Detailed item-by-item diff for the chosen mode */}
              <div className="border rounded-lg max-h-72 overflow-y-auto divide-y">
                <DiffSection title="Topics" icon={<FolderTree className="h-3.5 w-3.5" />} items={combinedDiff.topics} />
                <DiffSection title="Assignments" icon={<FileText className="h-3.5 w-3.5" />} items={combinedDiff.assignments} />
                <DiffSection title="Announcements" icon={<Megaphone className="h-3.5 w-3.5" />} items={combinedDiff.announcements} />
              </div>
            </div>
          )}

          {step === "done" && lastImport && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400">Import complete</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Mode: <code className="bg-muted px-1 rounded">{mode}</code></p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(["topics","assignments","announcements"] as const).map(k => (
                  <div key={k} className="rounded-lg border p-3">
                    <div className="font-medium capitalize mb-1">{k}</div>
                    <div className="text-emerald-600">+{lastImport[k].created} created</div>
                    <div className="text-blue-600">~{lastImport[k].updated} updated</div>
                    <div className="text-muted-foreground">{lastImport[k].skipped} skipped</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step === "preview" && (
              <Button variant="ghost" onClick={() => setStep("select")} disabled={loading}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {step === "select" && (
              <Button onClick={fetchSelectedCourses} disabled={selectedCourseIds.size === 0 || loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <FolderTree className="h-4 w-4 mr-1.5" />}
                Preview {selectedCourseIds.size} course{selectedCourseIds.size === 1 ? "" : "s"}
              </Button>
            )}
            {step === "preview" && combinedDiff && (
              <Button onClick={commit} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
                Commit {combinedDiff.totals.topics.created + combinedDiff.totals.topics.updated
                  + combinedDiff.totals.assignments.created + combinedDiff.totals.assignments.updated
                  + combinedDiff.totals.announcements.created + combinedDiff.totals.announcements.updated} item(s)
              </Button>
            )}
            {step === "done" && (
              <Button onClick={() => setStep("select")}>Import another</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- Sub-components ---------- */

function SelectionGroup({
  label, icon, items, selected, onToggle, onAll,
}: {
  label: string;
  icon: React.ReactNode;
  items: { id: string; label: string; sub?: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onAll: (on: boolean) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {icon} {label} <span className="text-muted-foreground">({selected.size}/{items.length})</span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => onAll(true)}>All</Button>
          <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => onAll(false)}>None</Button>
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto divide-y">
        {items.map(it => (
          <label key={it.id} className="flex items-start gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent/40">
            <Checkbox checked={selected.has(it.id)} onCheckedChange={() => onToggle(it.id)} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate">{it.label}</div>
              {it.sub && <div className="text-[10px] text-muted-foreground">{it.sub}</div>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function DiffTotalsCard({ title, diff, active }: { title: string; diff: ImportDiff; active: boolean }) {
  const t = diff.totals;
  const total = t.topics.created + t.topics.updated + t.topics.skipped
    + t.assignments.created + t.assignments.updated + t.assignments.skipped
    + t.announcements.created + t.announcements.updated + t.announcements.skipped;
  return (
    <div className={`rounded-lg border p-3 ${active ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold">{title}</div>
        {active && <Badge variant="secondary" className="text-[10px]">Selected</Badge>}
      </div>
      <div className="space-y-0.5 text-[11px]">
        {(["topics", "assignments", "announcements"] as const).map(k => (
          <div key={k} className="flex justify-between">
            <span className="capitalize text-muted-foreground">{k}</span>
            <span className="font-mono">
              <span className="text-emerald-600">+{t[k].created}</span>{" "}
              <span className="text-blue-600">~{t[k].updated}</span>{" "}
              <span className="text-muted-foreground">·{t[k].skipped}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 border-t text-[11px] text-muted-foreground">{total} item(s)</div>
    </div>
  );
}

function DiffSection({ title, icon, items }: { title: string; icon: React.ReactNode; items: ImportDiff["topics"] }) {
  if (items.length === 0) return null;
  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
        {icon} {title} <span className="text-muted-foreground">({items.length})</span>
      </div>
      <ul className="space-y-1">
        {items.map(it => (
          <li key={it.sourceKey} className="flex items-center gap-2 text-[11px]">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[it.status]}`}>
              {it.status}
            </span>
            <span className="truncate flex-1">{it.title}</span>
            {it.reason && <span className="text-muted-foreground italic">{it.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
