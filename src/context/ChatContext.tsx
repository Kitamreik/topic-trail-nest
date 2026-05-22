import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ChatMessage {
  id: string;
  threadId: string; // studentId — one thread per student
  fromId: string;
  fromName: string;
  fromRole: "student" | "admin";
  body: string;
  createdAt: string;
  readBy: string[];
}

// Common graduate-level inquiry categories used as thread tags.
export const THREAD_TAGS = [
  "General",
  "Office Hours",
  "Assignment Help",
  "Extension Request",
  "Grade Review",
  "Research / Thesis",
  "Recommendation Letter",
  "Reading / Resources",
  "Conference / Publication",
  "Course Prerequisite",
  "Accommodation",
  "Administrative",
] as const;
export type ThreadTag = (typeof THREAD_TAGS)[number];

interface ChatContextType {
  messages: ChatMessage[];
  threadMessages: (studentId: string) => ChatMessage[];
  sendMessage: (
    threadId: string,
    from: { id: string; name: string; role: "student" | "admin" },
    body: string,
  ) => void;
  markThreadRead: (threadId: string, userId: string) => void;
  unreadCountForThread: (threadId: string, userId: string) => number;
  getThreadTag: (threadId: string) => ThreadTag;
  setThreadTag: (threadId: string, tag: ThreadTag) => void;
  threadTags: Record<string, ThreadTag>;
}

const STORAGE_KEY = "academic-stream-chat";
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

interface PersistShape {
  messages: ChatMessage[];
  threadTags: Record<string, ThreadTag>;
}

function load(): PersistShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return { messages: parsed, threadTags: {} }; // old format
      return {
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        threadTags: parsed.threadTags ?? {},
      };
    }
  } catch {}
  return { messages: [], threadTags: {} };
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const initial = load();
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [threadTags, setThreadTags] = useState<Record<string, ThreadTag>>(initial.threadTags);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, threadTags }));
  }, [messages, threadTags]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          } else {
            setMessages(parsed.messages ?? []);
            setThreadTags(parsed.threadTags ?? {});
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const threadMessages = useCallback(
    (studentId: string) =>
      messages
        .filter((m) => m.threadId === studentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages],
  );

  const sendMessage: ChatContextType["sendMessage"] = useCallback((threadId, from, body) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        threadId,
        fromId: from.id,
        fromName: from.name,
        fromRole: from.role,
        body: trimmed,
        createdAt: now(),
        readBy: [from.id],
      },
    ]);
  }, []);

  const markThreadRead = useCallback((threadId: string, userId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.threadId === threadId && !m.readBy.includes(userId)
          ? { ...m, readBy: [...m.readBy, userId] }
          : m,
      ),
    );
  }, []);

  const unreadCountForThread = useCallback(
    (threadId: string, userId: string) =>
      messages.filter((m) => m.threadId === threadId && !m.readBy.includes(userId)).length,
    [messages],
  );

  const getThreadTag = useCallback(
    (threadId: string): ThreadTag => threadTags[threadId] ?? "General",
    [threadTags],
  );

  const setThreadTag = useCallback((threadId: string, tag: ThreadTag) => {
    setThreadTags((prev) => ({ ...prev, [threadId]: tag }));
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        threadMessages,
        sendMessage,
        markThreadRead,
        unreadCountForThread,
        getThreadTag,
        setThreadTag,
        threadTags,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
