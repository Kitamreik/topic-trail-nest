import { useState, useMemo } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Megaphone, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface SearchResult {
  type: "topic" | "announcement" | "discussion";
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { topics, announcements, discussions } = useLMS();
  const { activeSemester } = useSemester();
  const navigate = useNavigate();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const r: SearchResult[] = [];

    topics
      .filter(t => t.semesterId === activeSemester.id)
      .forEach(t => {
        if (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
          r.push({ type: "topic", id: t.id, title: t.title, subtitle: t.description, route: "/topics" });
        }
        t.content.forEach(c => {
          if (c.title.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)) {
            r.push({ type: "topic", id: c.id, title: c.title, subtitle: `in ${t.title}`, route: "/topics" });
          }
        });
      });

    announcements
      .filter(a => a.semesterId === activeSemester.id)
      .forEach(a => {
        if (a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)) {
          r.push({ type: "announcement", id: a.id, title: a.title, subtitle: format(new Date(a.createdAt), "MMM d, yyyy"), route: "/announcements" });
        }
      });

    discussions.forEach(d => {
      if (d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q)) {
        r.push({ type: "discussion", id: d.id, title: d.title, subtitle: `by ${d.author}`, route: "/discussions" });
      }
      d.replies.forEach(rep => {
        if (rep.body.toLowerCase().includes(q)) {
          r.push({ type: "discussion", id: rep.id, title: `Reply in "${d.title}"`, subtitle: `by ${rep.author}`, route: "/discussions" });
        }
      });
    });

    return r.slice(0, 10);
  }, [query, topics, announcements, discussions, activeSemester.id]);

  const icon = (type: SearchResult["type"]) => {
    switch (type) {
      case "topic": return <BookOpen className="h-4 w-4 text-primary shrink-0" />;
      case "announcement": return <Megaphone className="h-4 w-4 text-warning shrink-0" />;
      case "discussion": return <MessageCircle className="h-4 w-4 text-secondary shrink-0" />;
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics, announcements, discussions..."
          className="pl-9 h-9 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
      </div>
      {focused && query.trim() && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No results found.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}-${i}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                onMouseDown={() => { setQuery(""); navigate(r.route); }}
              >
                {icon(r.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
