import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat, THREAD_TAGS, type ThreadTag } from "@/context/ChatContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Send, User as UserIcon, GraduationCap,
  Check, CheckCheck, Lightbulb, Search, X, Tag as TagIcon,
} from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Common graduate-level student inquiry starters
const TOPIC_PROMPTS: { label: string; body: string }[] = [
  { label: "Office hours request", body: "Hi Professor — could we set up a time to meet during office hours this week? I'd like to discuss " },
  { label: "Assignment clarification", body: "Hello — I have a question about the requirements for the upcoming assignment. Specifically, " },
  { label: "Extension request", body: "Dear Professor, I'd like to respectfully request a short extension on the upcoming deadline because " },
  { label: "Research / thesis guidance", body: "Hi Professor, I'd appreciate your input on my research direction. I'm currently exploring " },
  { label: "Letter of recommendation", body: "Hello Professor — would you be willing to write a letter of recommendation for me? The deadline is " },
  { label: "Grade review", body: "Hi Professor, I'd like to better understand the feedback on my recent submission. Could we go over " },
  { label: "Reading list / resources", body: "Hello — could you recommend additional readings or resources on the topic of " },
  { label: "Conference / publication advice", body: "Hi Professor, I'm considering submitting work to a conference and would value your guidance on " },
  { label: "Course prerequisite question", body: "Hello — I wanted to check whether I have the right background to enroll in your course on " },
  { label: "Accommodation / accessibility", body: "Hi Professor, I'd like to discuss an accommodation I may need for the course. Specifically, " },
];

export default function Chat() {
  const { user, getAllUsers, isAdmin, isStudent } = useAuth();
  const {
    threadMessages,
    sendMessage,
    markThreadRead,
    unreadCountForThread,
    messages: allMessages,
    getThreadTag,
    setThreadTag,
  } = useChat();

  const allUsers = useMemo(() => getAllUsers(), [getAllUsers]);
  const students = useMemo(() => allUsers.filter((u) => u.role === "student"), [allUsers]);
  const instructors = useMemo(() => allUsers.filter((u) => u.role === "admin"), [allUsers]);
  const primaryInstructor = instructors[0];

  // Active thread = a studentId
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    if (isStudent && user) return user.id;
    return students[0]?.id ?? null;
  });

  const messages = activeThreadId ? threadMessages(activeThreadId) : [];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Admin search across all student threads
  const [search, setSearch] = useState("");
  const searchResults = useMemo(() => {
    if (!isAdmin || !search.trim()) return [];
    const q = search.toLowerCase();
    return allMessages
      .filter((m) => m.body.toLowerCase().includes(q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);
  }, [allMessages, search, isAdmin]);

  // Mark messages read when thread opens / new messages arrive
  useEffect(() => {
    if (activeThreadId && user) markThreadRead(activeThreadId, user.id);
  }, [activeThreadId, user, messages.length, markThreadRead]);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeThreadId]);

  if (!user) return null;

  const handleSend = () => {
    if (!activeThreadId || !draft.trim()) return;
    sendMessage(
      activeThreadId,
      { id: user.id, name: user.name, role: isAdmin ? "admin" : "student" },
      draft,
    );
    setDraft("");
  };

  const insertPrompt = (body: string) => {
    setDraft((prev) => (prev.trim() ? prev + "\n\n" + body : body));
    // Focus so they can finish the sentence
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const counterpart = (() => {
    if (!activeThreadId) return null;
    if (isStudent) return primaryInstructor ?? null;
    return students.find((s) => s.id === activeThreadId) ?? null;
  })();

  // Read receipt: a sent message is "Read" once the counterpart appears in readBy.
  const isReadByCounterpart = (readBy: string[]) => {
    if (isStudent) return !!primaryInstructor && readBy.includes(primaryInstructor.id);
    if (isAdmin && activeThreadId) return readBy.includes(activeThreadId);
    return false;
  };

  const jumpToResult = (threadId: string) => {
    setActiveThreadId(threadId);
    setSearch("");
  };

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/20 text-foreground rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStudent
              ? "Private chat with your instructor."
              : "Private chats with each of your students."}
          </p>
        </div>

        {isAdmin && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages across students…"
              className="pl-8 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {search.trim() && (
              <Card className="absolute z-30 mt-1 w-full max-h-80 overflow-y-auto p-1 shadow-lg">
                {searchResults.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No matches.</p>
                ) : (
                  searchResults.map((m) => {
                    const student = students.find((s) => s.id === m.threadId);
                    return (
                      <button
                        key={m.id}
                        onClick={() => jumpToResult(m.threadId)}
                        className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[11px] font-medium truncate">
                            {student?.name ?? "Unknown"} · {m.fromName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {highlight(m.body, search.trim())}
                        </p>
                      </button>
                    );
                  })
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        {/* Thread list — only useful for admins */}
        {isAdmin && (
          <Card className="p-2 max-h-[60vh] md:max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground font-body">
              Students
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 p-1">
                {students.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4">No students yet.</p>
                )}
                {students.map((s) => {
                  const unread = unreadCountForThread(s.id, user.id);
                  const isActive = s.id === activeThreadId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveThreadId(s.id)}
                      className={`text-left flex items-center gap-2 px-2 py-2 rounded-md transition-colors ${
                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>
                        <Badge variant="outline" className="mt-1 h-4 px-1.5 text-[9px] gap-0.5 font-normal">
                          <TagIcon className="h-2.5 w-2.5" />{getThreadTag(s.id)}
                        </Badge>
                      </div>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unread}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Conversation */}
        <Card className="flex flex-col h-[70vh] min-h-[420px] overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {isStudent ? (
                <GraduationCap className="h-5 w-5 text-primary" />
              ) : (
                <UserIcon className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {counterpart?.name ?? (isStudent ? "Instructor" : "Select a student")}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {counterpart?.email ?? ""}
              </p>
            </div>
            {activeThreadId && (
              isAdmin ? (
                <Select
                  value={getThreadTag(activeThreadId)}
                  onValueChange={(v) => setThreadTag(activeThreadId, v as ThreadTag)}
                >
                  <SelectTrigger className="h-8 w-[150px] text-xs shrink-0" aria-label="Conversation topic">
                    <TagIcon className="h-3 w-3 mr-1 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THREAD_TAGS.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
                  <TagIcon className="h-3 w-3" />{getThreadTag(activeThreadId)}
                </Badge>
              )
            )}
          </div>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {!activeThreadId && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8" />
                <p className="text-sm">Pick a student to start chatting.</p>
              </div>
            )}
            {activeThreadId && messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8" />
                <p className="text-sm">No messages yet — say hello!</p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.fromId === user.id;
              const read = mine && isReadByCounterpart(m.readBy);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    {!mine && (
                      <p className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                        {m.fromName}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 text-[10px] ${
                        mine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
                      }`}
                    >
                      <span>{formatTime(m.createdAt)}</span>
                      {mine && (
                        <span
                          className="flex items-center gap-0.5"
                          title={read ? "Read" : "Sent"}
                          aria-label={read ? "Read" : "Sent"}
                        >
                          {read ? (
                            <>
                              <CheckCheck className="h-3 w-3" />
                              <span>Read</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Sent</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border p-2 sm:p-3"
          >
            {isStudent && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Insert a conversation starter"
                    aria-label="Insert a conversation starter"
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuLabel className="text-xs">Conversation starters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {TOPIC_PROMPTS.map((p) => (
                    <DropdownMenuItem
                      key={p.label}
                      onClick={() => insertPrompt(p.body)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-sm font-medium">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {p.body}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                activeThreadId
                  ? "Write a message…"
                  : isAdmin
                  ? "Select a student first"
                  : "No instructor available"
              }
              disabled={!activeThreadId || (isStudent && !primaryInstructor)}
              className="flex-1 min-w-0"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0"
              disabled={!draft.trim() || !activeThreadId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
