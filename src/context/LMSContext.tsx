import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Types
export interface ContentItem {
  id: string;
  type: "link" | "pdf" | "image" | "text";
  title: string;
  url?: string;
  description?: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  semesterId: string;
  title: string;
  description: string;
  content: ContentItem[];
  createdAt: string;
  /** Stable external identifier (e.g. "gclassroom:topic:<id>") used for re-import dedup. */
  externalId?: string;
}

export interface Announcement {
  id: string;
  semesterId: string;
  title: string;
  body: string;
  createdAt: string;
  externalId?: string;
}

export interface DiscussionPost {
  id: string;
  title: string;
  body: string;
  author: string;
  authorId: string;
  replies: DiscussionReply[];
  createdAt: string;
}

export interface DiscussionReply {
  id: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Assignment {
  id: string;
  topicId: string;
  semesterId: string;
  title: string;
  dueDate: string;
  maxScore: number;
  externalId?: string;
}

export interface Submission {
  id: string;
  studentId: string;
  assignmentId: string;
  fileName: string;
  fileUrl: string;
  submittedAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  score: number | null;
  turnedIn: boolean;
  turnedInAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "deadline" | "grade" | "announcement" | "discussion";
  read: boolean;
  createdAt: string;
}

export interface VaultFile {
  id: string;
  studentId: string;
  semesterId: string;
  fileName: string;
  fileUrl: string;
  fileType: "link" | "upload";
  addedAt: string;
}

interface LMSState {
  topics: Topic[];
  announcements: Announcement[];
  discussions: DiscussionPost[];
  students: Student[];
  assignments: Assignment[];
  grades: Grade[];
  submissions: Submission[];
  notifications: Notification[];
  vaultFiles: VaultFile[];
}

interface LMSContextType extends LMSState {
  addTopic: (topic: Omit<Topic, "id" | "createdAt" | "content">) => void;
  updateTopic: (id: string, data: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  addContentToTopic: (topicId: string, content: Omit<ContentItem, "id" | "createdAt">) => void;
  removeContentFromTopic: (topicId: string, contentId: string) => void;
  addAnnouncement: (a: Omit<Announcement, "id" | "createdAt">) => void;
  updateAnnouncement: (id: string, data: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  addDiscussion: (d: Omit<DiscussionPost, "id" | "createdAt" | "replies">) => void;
  addReply: (discussionId: string, reply: Omit<DiscussionReply, "id" | "createdAt">) => void;
  updateReply: (discussionId: string, replyId: string, body: string) => void;
  deleteDiscussion: (id: string) => void;
  addAssignment: (a: Omit<Assignment, "id">) => void;
  updateGrade: (studentId: string, assignmentId: string, score: number) => void;
  toggleTurnedIn: (studentId: string, assignmentId: string) => void;
  addSubmission: (sub: Omit<Submission, "id" | "submittedAt">) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addVaultFile: (f: Omit<VaultFile, "id" | "addedAt">) => void;
  deleteVaultFile: (id: string) => void;
  reorderTopics: (semesterId: string, fromIndex: number, toIndex: number) => void;
  reorderContent: (topicId: string, fromIndex: number, toIndex: number) => void;
  bulkImport: (plan: ImportPlan, mode: ImportMode) => ImportResult;
  previewImport: (plan: ImportPlan, mode: ImportMode) => ImportDiff;
}

export type ImportMode = "merge" | "overwrite";

export interface ImportPlan {
  semesterId: string;
  /** Topics keyed by an external sourceKey (e.g. Classroom topicId or a fallback). */
  topics: Array<{
    sourceKey: string;
    title: string;
    description: string;
    externalId: string;
  }>;
  assignments: Array<{
    sourceKey: string;
    /** Refers to ImportPlan.topics[].sourceKey. If missing/unknown, falls back to fallbackTopicSourceKey. */
    topicSourceKey?: string;
    title: string;
    dueDate: string;
    maxScore: number;
    externalId: string;
  }>;
  announcements: Array<{
    sourceKey: string;
    title: string;
    body: string;
    externalId: string;
  }>;
  /** Optional sourceKey of a fallback topic for assignments without a topic. */
  fallbackTopicSourceKey?: string;
}

export interface ImportResult {
  topics: { created: number; updated: number; skipped: number };
  assignments: { created: number; updated: number; skipped: number };
  announcements: { created: number; updated: number; skipped: number };
}

export type ItemStatus = "create" | "update" | "skip";
export interface ImportDiffItem {
  sourceKey: string;
  title: string;
  status: ItemStatus;
  existingId?: string;
  topicSourceKey?: string;
  reason?: string;
}
export interface ImportDiff {
  topics: ImportDiffItem[];
  assignments: ImportDiffItem[];
  announcements: ImportDiffItem[];
  totals: ImportResult;
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const STORAGE_KEY = "academic-stream-lms";

const defaultStudents: Student[] = [
  { id: "s1", name: "Alice Johnson", email: "alice@university.edu" },
  { id: "s2", name: "Bob Smith", email: "bob@university.edu" },
  { id: "s3", name: "Carol Davis", email: "carol@university.edu" },
  { id: "s4", name: "David Lee", email: "david@university.edu" },
  { id: "s5", name: "Emma Wilson", email: "emma@university.edu" },
];

const defaultTopics: Topic[] = [
  {
    id: "t1", semesterId: "sem-5",
    title: "Introduction to Computer Science",
    description: "Foundational concepts in CS including algorithms, data structures, and computational thinking.",
    content: [
      { id: "c1", type: "link", title: "Course Syllabus", url: "https://example.com/syllabus", createdAt: now() },
      { id: "c2", type: "pdf", title: "Week 1 Lecture Notes", url: "/placeholder.svg", createdAt: now() },
    ],
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "t2", semesterId: "sem-5",
    title: "Data Structures & Algorithms",
    description: "In-depth study of arrays, linked lists, trees, graphs, sorting, and searching algorithms.",
    content: [
      { id: "c3", type: "text", title: "Assignment 1: Array Operations", description: "Implement basic array operations including insert, delete, and search.", createdAt: now() },
    ],
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "t3", semesterId: "sem-4",
    title: "Operating Systems",
    description: "Processes, threads, memory management, and file systems.",
    content: [],
    createdAt: "2025-09-01T10:00:00Z",
  },
];

const defaultAssignments: Assignment[] = [
  { id: "a1", topicId: "t1", semesterId: "sem-5", title: "CS Fundamentals Quiz", dueDate: "2026-03-20T23:59:00Z", maxScore: 100 },
  { id: "a2", topicId: "t2", semesterId: "sem-5", title: "Array Implementation", dueDate: "2026-03-25T23:59:00Z", maxScore: 50 },
  { id: "a3", topicId: "t3", semesterId: "sem-4", title: "OS Concepts Quiz", dueDate: "2025-11-15T23:59:00Z", maxScore: 80 },
];

const defaultGrades: Grade[] = [
  { id: "g1", studentId: "s1", assignmentId: "a1", score: 92, turnedIn: true, turnedInAt: "2026-03-18T14:00:00Z" },
  { id: "g2", studentId: "s2", assignmentId: "a1", score: 85, turnedIn: true, turnedInAt: "2026-03-19T10:00:00Z" },
  { id: "g3", studentId: "s3", assignmentId: "a1", score: null, turnedIn: false },
  { id: "g4", studentId: "s4", assignmentId: "a1", score: 78, turnedIn: true, turnedInAt: "2026-03-17T08:00:00Z" },
  { id: "g5", studentId: "s5", assignmentId: "a1", score: null, turnedIn: false },
  { id: "g6", studentId: "s1", assignmentId: "a2", score: 45, turnedIn: true, turnedInAt: "2026-03-22T16:00:00Z" },
  { id: "g7", studentId: "s2", assignmentId: "a2", score: null, turnedIn: false },
  { id: "g8", studentId: "s3", assignmentId: "a2", score: 38, turnedIn: true, turnedInAt: "2026-03-24T12:00:00Z" },
  { id: "g9", studentId: "s4", assignmentId: "a2", score: null, turnedIn: false },
  { id: "g10", studentId: "s5", assignmentId: "a2", score: 48, turnedIn: true, turnedInAt: "2026-03-23T20:00:00Z" },
  { id: "g11", studentId: "s1", assignmentId: "a3", score: 72, turnedIn: true, turnedInAt: "2025-11-14T10:00:00Z" },
  { id: "g12", studentId: "s2", assignmentId: "a3", score: 65, turnedIn: true, turnedInAt: "2025-11-13T14:00:00Z" },
  { id: "g13", studentId: "s3", assignmentId: "a3", score: null, turnedIn: false },
  { id: "g14", studentId: "s4", assignmentId: "a3", score: 70, turnedIn: true, turnedInAt: "2025-11-12T08:00:00Z" },
  { id: "g15", studentId: "s5", assignmentId: "a3", score: null, turnedIn: false },
];

const defaultAnnouncements: Announcement[] = [
  { id: "an1", semesterId: "sem-5", title: "Welcome to Spring 2026!", body: "Welcome students! Please review the syllabus and come prepared for our first class.", createdAt: "2026-01-10T09:00:00Z" },
  { id: "an2", semesterId: "sem-5", title: "Midterm Exam Schedule", body: "The midterm exam will be held on March 28th. Please review Chapters 1-5.", createdAt: "2026-03-01T09:00:00Z" },
  { id: "an3", semesterId: "sem-4", title: "Fall 2025 Welcome", body: "Welcome to the Fall 2025 semester!", createdAt: "2025-08-25T09:00:00Z" },
];

const defaultDiscussions: DiscussionPost[] = [
  {
    id: "d1", title: "Best resources for learning algorithms?", body: "What books or websites do you recommend for additional practice?",
    author: "Alice Johnson", authorId: "s1",
    replies: [
      { id: "r1", body: "I really like 'Introduction to Algorithms' by CLRS!", author: "Bob Smith", authorId: "s2", createdAt: "2026-03-02T14:00:00Z" },
      { id: "r2", body: "LeetCode has great practice problems.", author: "Carol Davis", authorId: "s3", createdAt: "2026-03-02T15:30:00Z" },
    ],
    createdAt: "2026-03-02T10:00:00Z",
  },
];

const defaultNotifications: Notification[] = [
  { id: "n1", title: "Assignment Due Soon", body: "CS Fundamentals Quiz is due on March 20th.", type: "deadline", read: false, createdAt: "2026-03-17T08:00:00Z" },
  { id: "n2", title: "New Announcement", body: "Midterm Exam Schedule has been posted.", type: "announcement", read: false, createdAt: "2026-03-01T09:00:00Z" },
];

const defaultState: LMSState = {
  topics: defaultTopics,
  announcements: defaultAnnouncements,
  discussions: defaultDiscussions,
  students: defaultStudents,
  assignments: defaultAssignments,
  grades: defaultGrades,
  submissions: [],
  notifications: defaultNotifications,
  vaultFiles: [],
};

function loadState(): LMSState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: add submissions if missing
      if (!parsed.submissions) parsed.submissions = [];
      if (!parsed.vaultFiles) parsed.vaultFiles = [];
      // Migration: add semesterId if missing
      parsed.topics = parsed.topics?.map((t: any) => ({ semesterId: "sem-5", ...t })) || [];
      parsed.announcements = parsed.announcements?.map((a: any) => ({ semesterId: "sem-5", ...a })) || [];
      parsed.assignments = parsed.assignments?.map((a: any) => ({ semesterId: "sem-5", ...a })) || [];
      // Migration: add authorId if missing
      parsed.discussions = parsed.discussions?.map((d: any) => ({
        authorId: "", ...d,
        replies: d.replies?.map((r: any) => ({ authorId: "", ...r })) || [],
      })) || [];
      return parsed;
    }
  } catch {}
  return defaultState;
}

const LMSContext = createContext<LMSContextType | null>(null);

export function LMSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LMSState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((fn: (prev: LMSState) => LMSState) => setState(fn), []);

  const addTopic = useCallback((t: Omit<Topic, "id" | "createdAt" | "content">) => {
    update(s => ({ ...s, topics: [...s.topics, { ...t, id: uid(), content: [], createdAt: now() }] }));
  }, [update]);

  const updateTopic = useCallback((id: string, data: Partial<Topic>) => {
    update(s => ({ ...s, topics: s.topics.map(t => t.id === id ? { ...t, ...data } : t) }));
  }, [update]);

  const deleteTopic = useCallback((id: string) => {
    update(s => ({ ...s, topics: s.topics.filter(t => t.id !== id) }));
  }, [update]);

  const addContentToTopic = useCallback((topicId: string, content: Omit<ContentItem, "id" | "createdAt">) => {
    update(s => ({
      ...s,
      topics: s.topics.map(t =>
        t.id === topicId ? { ...t, content: [...t.content, { ...content, id: uid(), createdAt: now() }] } : t
      ),
    }));
  }, [update]);

  const removeContentFromTopic = useCallback((topicId: string, contentId: string) => {
    update(s => ({
      ...s,
      topics: s.topics.map(t =>
        t.id === topicId ? { ...t, content: t.content.filter(c => c.id !== contentId) } : t
      ),
    }));
  }, [update]);

  const addAnnouncement = useCallback((a: Omit<Announcement, "id" | "createdAt">) => {
    const newA = { ...a, id: uid(), createdAt: now() };
    update(s => ({
      ...s,
      announcements: [newA, ...s.announcements],
      notifications: [
        { id: uid(), title: "New Announcement", body: a.title, type: "announcement" as const, read: false, createdAt: now() },
        ...s.notifications,
      ],
    }));
  }, [update]);

  const updateAnnouncement = useCallback((id: string, data: Partial<Announcement>) => {
    update(s => ({ ...s, announcements: s.announcements.map(a => a.id === id ? { ...a, ...data } : a) }));
  }, [update]);

  const deleteAnnouncement = useCallback((id: string) => {
    update(s => ({ ...s, announcements: s.announcements.filter(a => a.id !== id) }));
  }, [update]);

  const addDiscussion = useCallback((d: Omit<DiscussionPost, "id" | "createdAt" | "replies">) => {
    update(s => ({ ...s, discussions: [{ ...d, id: uid(), replies: [], createdAt: now() }, ...s.discussions] }));
  }, [update]);

  const addReply = useCallback((discussionId: string, reply: Omit<DiscussionReply, "id" | "createdAt">) => {
    update(s => ({
      ...s,
      discussions: s.discussions.map(d =>
        d.id === discussionId
          ? { ...d, replies: [...d.replies, { ...reply, id: uid(), createdAt: now() }] }
          : d
      ),
    }));
  }, [update]);

  const updateReply = useCallback((discussionId: string, replyId: string, body: string) => {
    update(s => ({
      ...s,
      discussions: s.discussions.map(d =>
        d.id === discussionId
          ? { ...d, replies: d.replies.map(r => r.id === replyId ? { ...r, body } : r) }
          : d
      ),
    }));
  }, [update]);

  const deleteDiscussion = useCallback((id: string) => {
    update(s => ({ ...s, discussions: s.discussions.filter(d => d.id !== id) }));
  }, [update]);

  const addAssignment = useCallback((a: Omit<Assignment, "id">) => {
    const newA = { ...a, id: uid() };
    update(s => ({
      ...s,
      assignments: [...s.assignments, newA],
      grades: [
        ...s.grades,
        ...s.students.map(st => ({
          id: uid(), studentId: st.id, assignmentId: newA.id, score: null, turnedIn: false,
        })),
      ],
    }));
  }, [update]);

  const updateGrade = useCallback((studentId: string, assignmentId: string, score: number) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.studentId === studentId && g.assignmentId === assignmentId
          ? { ...g, score, turnedIn: true, turnedInAt: g.turnedInAt || now() }
          : g
      ),
    }));
  }, [update]);

  const toggleTurnedIn = useCallback((studentId: string, assignmentId: string) => {
    update(s => ({
      ...s,
      grades: s.grades.map(g =>
        g.studentId === studentId && g.assignmentId === assignmentId
          ? { ...g, turnedIn: !g.turnedIn, turnedInAt: !g.turnedIn ? now() : undefined }
          : g
      ),
    }));
  }, [update]);

  const addSubmission = useCallback((sub: Omit<Submission, "id" | "submittedAt">) => {
    update(s => ({
      ...s,
      submissions: [...s.submissions, { ...sub, id: uid(), submittedAt: now() }],
      grades: s.grades.map(g =>
        g.studentId === sub.studentId && g.assignmentId === sub.assignmentId
          ? { ...g, turnedIn: true, turnedInAt: g.turnedInAt || now() }
          : g
      ),
    }));
  }, [update]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt" | "read">) => {
    update(s => ({
      ...s,
      notifications: [{ ...n, id: uid(), read: false, createdAt: now() }, ...s.notifications],
    }));
  }, [update]);

  const markNotificationRead = useCallback((id: string) => {
    update(s => ({
      ...s,
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  }, [update]);

  const clearNotifications = useCallback(() => {
    update(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, read: true })) }));
  }, [update]);

  const addVaultFile = useCallback((f: Omit<VaultFile, "id" | "addedAt">) => {
    update(s => ({
      ...s,
      vaultFiles: [...s.vaultFiles, { ...f, id: uid(), addedAt: now() }],
    }));
  }, [update]);

  const deleteVaultFile = useCallback((id: string) => {
    update(s => ({ ...s, vaultFiles: s.vaultFiles.filter(f => f.id !== id) }));
  }, [update]);

  const reorderTopics = useCallback((semesterId: string, fromIndex: number, toIndex: number) => {
    update(s => {
      const semTopics = s.topics.filter(t => t.semesterId === semesterId);
      const otherTopics = s.topics.filter(t => t.semesterId !== semesterId);
      const [moved] = semTopics.splice(fromIndex, 1);
      semTopics.splice(toIndex, 0, moved);
      return { ...s, topics: [...otherTopics, ...semTopics] };
    });
  }, [update]);

  const reorderContent = useCallback((topicId: string, fromIndex: number, toIndex: number) => {
    update(s => ({
      ...s,
      topics: s.topics.map(t => {
        if (t.id !== topicId) return t;
        const content = [...t.content];
        const [moved] = content.splice(fromIndex, 1);
        content.splice(toIndex, 0, moved);
        return { ...t, content };
      }),
    }));
  }, [update]);

  const bulkImport = useCallback((plan: ImportPlan, mode: ImportMode): ImportResult => {
    const result: ImportResult = {
      topics: { created: 0, updated: 0, skipped: 0 },
      assignments: { created: 0, updated: 0, skipped: 0 },
      announcements: { created: 0, updated: 0, skipped: 0 },
    };

    setState(s => {
      let topics = [...s.topics];
      let assignments = [...s.assignments];
      let announcements = [...s.announcements];
      let grades = [...s.grades];

      const planTopicExternalIds = new Set(plan.topics.map(t => t.externalId));
      const planAssignmentExternalIds = new Set(plan.assignments.map(a => a.externalId));
      const planAnnouncementExternalIds = new Set(plan.announcements.map(a => a.externalId));

      // OVERWRITE: drop any prior items in this semester that came from a previous import
      // and that are also present in this new plan (matched by externalId).
      if (mode === "overwrite") {
        const droppedAssignmentIds = new Set(
          assignments
            .filter(a => a.semesterId === plan.semesterId && a.externalId && planAssignmentExternalIds.has(a.externalId))
            .map(a => a.id),
        );
        assignments = assignments.filter(a => !droppedAssignmentIds.has(a.id));
        grades = grades.filter(g => !droppedAssignmentIds.has(g.assignmentId));

        topics = topics.filter(
          t => !(t.semesterId === plan.semesterId && t.externalId && planTopicExternalIds.has(t.externalId)),
        );
        announcements = announcements.filter(
          a => !(a.semesterId === plan.semesterId && a.externalId && planAnnouncementExternalIds.has(a.externalId)),
        );
      }

      // Upsert topics — resolve sourceKey -> topicId after the operation.
      const topicIdBySourceKey = new Map<string, string>();
      for (const pt of plan.topics) {
        const existing = topics.find(
          t => t.semesterId === plan.semesterId && t.externalId === pt.externalId,
        );
        if (existing) {
          if (mode === "merge") {
            topics = topics.map(t =>
              t.id === existing.id ? { ...t, title: pt.title, description: pt.description } : t,
            );
            result.topics.updated++;
          } else {
            // overwrite already dropped — this branch shouldn't run; treat as skip
            result.topics.skipped++;
          }
          topicIdBySourceKey.set(pt.sourceKey, existing.id);
        } else {
          const id = uid();
          topics.push({
            id, semesterId: plan.semesterId, title: pt.title, description: pt.description,
            content: [], createdAt: now(), externalId: pt.externalId,
          });
          topicIdBySourceKey.set(pt.sourceKey, id);
          result.topics.created++;
        }
      }

      const resolveTopicId = (key?: string): string | null => {
        if (key && topicIdBySourceKey.has(key)) return topicIdBySourceKey.get(key)!;
        if (plan.fallbackTopicSourceKey && topicIdBySourceKey.has(plan.fallbackTopicSourceKey)) {
          return topicIdBySourceKey.get(plan.fallbackTopicSourceKey)!;
        }
        return null;
      };

      // Upsert assignments
      for (const pa of plan.assignments) {
        const topicId = resolveTopicId(pa.topicSourceKey);
        if (!topicId) { result.assignments.skipped++; continue; }
        const existing = assignments.find(
          a => a.semesterId === plan.semesterId && a.externalId === pa.externalId,
        );
        if (existing) {
          if (mode === "merge") {
            assignments = assignments.map(a =>
              a.id === existing.id
                ? { ...a, title: pa.title, dueDate: pa.dueDate, maxScore: pa.maxScore, topicId }
                : a,
            );
            result.assignments.updated++;
          } else {
            result.assignments.skipped++;
          }
        } else {
          const id = uid();
          assignments.push({
            id, topicId, semesterId: plan.semesterId,
            title: pa.title, dueDate: pa.dueDate, maxScore: pa.maxScore,
            externalId: pa.externalId,
          });
          grades.push(
            ...s.students.map(st => ({
              id: uid(), studentId: st.id, assignmentId: id, score: null, turnedIn: false,
            })),
          );
          result.assignments.created++;
        }
      }

      // Upsert announcements
      for (const pn of plan.announcements) {
        const existing = announcements.find(
          a => a.semesterId === plan.semesterId && a.externalId === pn.externalId,
        );
        if (existing) {
          if (mode === "merge") {
            announcements = announcements.map(a =>
              a.id === existing.id ? { ...a, title: pn.title, body: pn.body } : a,
            );
            result.announcements.updated++;
          } else {
            result.announcements.skipped++;
          }
        } else {
          announcements.unshift({
            id: uid(), semesterId: plan.semesterId, title: pn.title, body: pn.body,
            createdAt: now(), externalId: pn.externalId,
          });
          result.announcements.created++;
        }
      }

      return { ...s, topics, assignments, announcements, grades };
    });

    return result;
  }, []);

  /**
   * Pure simulation of bulkImport against current state — returns per-item statuses
   * for the given mode without mutating anything. Used to show the diff preview.
   */
  const previewImport = useCallback((plan: ImportPlan, mode: ImportMode): ImportDiff => {
    const diff: ImportDiff = {
      topics: [],
      assignments: [],
      announcements: [],
      totals: {
        topics: { created: 0, updated: 0, skipped: 0 },
        assignments: { created: 0, updated: 0, skipped: 0 },
        announcements: { created: 0, updated: 0, skipped: 0 },
      },
    };

    // Track which topic sourceKeys will exist after the import — needed to resolve
    // assignment.topicSourceKey for the create branch.
    const topicSourceKeysAfter = new Set<string>();

    for (const pt of plan.topics) {
      const existing = state.topics.find(
        t => t.semesterId === plan.semesterId && t.externalId === pt.externalId,
      );
      // Overwrite drops then re-creates matching items, so the "existing" record
      // is gone — treat as a fresh create.
      if (existing && mode === "merge") {
        diff.topics.push({ sourceKey: pt.sourceKey, title: pt.title, status: "update", existingId: existing.id });
        diff.totals.topics.updated++;
      } else {
        diff.topics.push({ sourceKey: pt.sourceKey, title: pt.title, status: "create" });
        diff.totals.topics.created++;
      }
      topicSourceKeysAfter.add(pt.sourceKey);
    }

    const fallbackOk = plan.fallbackTopicSourceKey && topicSourceKeysAfter.has(plan.fallbackTopicSourceKey);

    for (const pa of plan.assignments) {
      const hasTopic = (pa.topicSourceKey && topicSourceKeysAfter.has(pa.topicSourceKey)) || fallbackOk;
      if (!hasTopic) {
        diff.assignments.push({
          sourceKey: pa.sourceKey, title: pa.title, status: "skip",
          topicSourceKey: pa.topicSourceKey, reason: "No matching topic in plan",
        });
        diff.totals.assignments.skipped++;
        continue;
      }
      const existing = state.assignments.find(
        a => a.semesterId === plan.semesterId && a.externalId === pa.externalId,
      );
      if (existing && mode === "merge") {
        diff.assignments.push({
          sourceKey: pa.sourceKey, title: pa.title, status: "update",
          existingId: existing.id, topicSourceKey: pa.topicSourceKey,
        });
        diff.totals.assignments.updated++;
      } else {
        diff.assignments.push({
          sourceKey: pa.sourceKey, title: pa.title, status: "create",
          topicSourceKey: pa.topicSourceKey,
        });
        diff.totals.assignments.created++;
      }
    }

    for (const pn of plan.announcements) {
      const existing = state.announcements.find(
        a => a.semesterId === plan.semesterId && a.externalId === pn.externalId,
      );
      if (existing && mode === "merge") {
        diff.announcements.push({ sourceKey: pn.sourceKey, title: pn.title, status: "update", existingId: existing.id });
        diff.totals.announcements.updated++;
      } else {
        diff.announcements.push({ sourceKey: pn.sourceKey, title: pn.title, status: "create" });
        diff.totals.announcements.created++;
      }
    }

    return diff;
  }, [state.topics, state.assignments, state.announcements]);

  return (
    <LMSContext.Provider
      value={{
        ...state,
        addTopic, updateTopic, deleteTopic,
        addContentToTopic, removeContentFromTopic,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        addDiscussion, addReply, updateReply, deleteDiscussion,
        addAssignment, updateGrade, toggleTurnedIn, addSubmission,
        addNotification, markNotificationRead, clearNotifications,
        addVaultFile, deleteVaultFile,
        reorderTopics, reorderContent,
        bulkImport,
        previewImport,
      }}
    >
      {children}
    </LMSContext.Provider>
  );
}

export function useLMS() {
  const ctx = useContext(LMSContext);
  if (!ctx) throw new Error("useLMS must be used within LMSProvider");
  return ctx;
}
