import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Pencil, Eraser, StickyNote, Image as ImageIcon, Trash2, Download,
  Undo2, Hand, X, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Point = { x: number; y: number };
type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  author: string;
  authorId: string;
  createdAt: string;
};
type Note = {
  id: string;
  x: number; y: number;
  text: string;
  color: string;
  author: string; authorId: string;
  createdAt: string;
};
type Upload = {
  id: string;
  x: number; y: number;
  w: number; h: number;
  name: string;
  dataUrl: string;
  author: string; authorId: string;
  createdAt: string;
};
type BoardState = { strokes: Stroke[]; notes: Note[]; uploads: Upload[] };

const TOOLS = ["pan", "pen", "eraser", "note"] as const;
type Tool = typeof TOOLS[number];

const NOTE_COLORS = ["#FEF08A", "#BFDBFE", "#BBF7D0", "#FBCFE8", "#FED7AA"];
const PEN_COLORS = ["#111827", "#2563EB", "#059669", "#DC2626", "#D97706", "#7C3AED"];

const CANVAS_W = 2000;
const CANVAS_H = 1400;

function storageKey(semId: string) {
  return `cookielms-whiteboard-${semId}`;
}

function loadBoard(semId: string): BoardState {
  try {
    const raw = localStorage.getItem(storageKey(semId));
    if (!raw) return { strokes: [], notes: [], uploads: [] };
    const parsed = JSON.parse(raw);
    return {
      strokes: parsed.strokes ?? [],
      notes: parsed.notes ?? [],
      uploads: parsed.uploads ?? [],
    };
  } catch {
    return { strokes: [], notes: [], uploads: [] };
  }
}

function saveBoard(semId: string, b: BoardState) {
  try {
    localStorage.setItem(storageKey(semId), JSON.stringify(b));
  } catch (e) {
    console.error("Whiteboard save failed", e);
  }
}

export default function Whiteboard() {
  const { user, isAdmin } = useAuth();
  const { activeSemester } = useSemester();
  const [board, setBoard] = useState<BoardState>(() => loadBoard(activeSemester.id));
  const [tool, setTool] = useState<Tool>("pan");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(3);
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [draggingNote, setDraggingNote] = useState<{ id: string; offX: number; offY: number } | null>(null);
  const [draggingUpload, setDraggingUpload] = useState<{ id: string; offX: number; offY: number } | null>(null);
  const [activeStroke, setActiveStroke] = useState<Point[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload when semester changes
  useEffect(() => { setBoard(loadBoard(activeSemester.id)); }, [activeSemester.id]);
  // Persist on every change
  useEffect(() => { saveBoard(activeSemester.id, board); }, [activeSemester.id, board]);

  // Redraw canvas
  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    // grid
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }
    ctx.restore();
    // strokes
    for (const s of board.strokes) {
      if (s.points.length < 1) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      ctx.stroke();
    }
    // active stroke
    if (activeStroke && activeStroke.length > 0) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(activeStroke[0].x, activeStroke[0].y);
      for (let i = 1; i < activeStroke.length; i++) ctx.lineTo(activeStroke[i].x, activeStroke[i].y);
      ctx.stroke();
    }
  }, [board.strokes, activeStroke, penColor, penWidth]);

  useEffect(() => { redraw(); }, [redraw]);

  const getBoardPoint = (e: React.PointerEvent): Point => {
    const rect = boardRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left + (boardRef.current?.scrollLeft ?? 0), y: e.clientY - rect.top + (boardRef.current?.scrollTop ?? 0) };
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!user) return;
    if (tool === "note") {
      const p = getBoardPoint(e);
      addNote(p.x - 90, p.y - 60);
      setTool("pan");
      return;
    }
    if (tool !== "pen" && tool !== "eraser") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setActiveStroke([getBoardPoint(e)]);
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStroke) return;
    setActiveStroke((prev) => prev ? [...prev, getBoardPoint(e)] : prev);
  };

  const onCanvasPointerUp = () => {
    if (!activeStroke || !user) { setActiveStroke(null); return; }
    if (tool === "eraser") {
      // remove strokes whose points pass within 12px of any active stroke point
      const erased = board.strokes.filter(s => !s.points.some(p1 => activeStroke.some(p2 => Math.hypot(p1.x - p2.x, p1.y - p2.y) < 12)));
      setBoard(b => ({ ...b, strokes: erased }));
    } else if (tool === "pen" && activeStroke.length > 1) {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: activeStroke,
        color: penColor,
        width: penWidth,
        author: user.name,
        authorId: user.id,
        createdAt: new Date().toISOString(),
      };
      setBoard(b => ({ ...b, strokes: [...b.strokes, stroke] }));
    }
    setActiveStroke(null);
  };

  const addNote = (x: number, y: number) => {
    if (!user) return;
    const note: Note = {
      id: crypto.randomUUID(),
      x, y, text: "",
      color: noteColor,
      author: user.name, authorId: user.id,
      createdAt: new Date().toISOString(),
    };
    setBoard(b => ({ ...b, notes: [...b.notes, note] }));
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    setBoard(b => ({ ...b, notes: b.notes.map(n => n.id === id ? { ...n, ...patch } : n) }));
  };

  const deleteNote = (id: string) => setBoard(b => ({ ...b, notes: b.notes.filter(n => n.id !== id) }));
  const deleteUpload = (id: string) => setBoard(b => ({ ...b, uploads: b.uploads.filter(u => u.id !== id) }));

  const undo = () => {
    setBoard(b => {
      // Find latest item by createdAt across strokes/notes/uploads owned by current user
      if (!user) return b;
      const own = [
        ...b.strokes.filter(s => s.authorId === user.id).map(s => ({ kind: "s" as const, id: s.id, t: s.createdAt })),
        ...b.notes.filter(n => n.authorId === user.id).map(n => ({ kind: "n" as const, id: n.id, t: n.createdAt })),
        ...b.uploads.filter(u => u.authorId === user.id).map(u => ({ kind: "u" as const, id: u.id, t: u.createdAt })),
      ].sort((a, c) => c.t.localeCompare(a.t));
      const last = own[0];
      if (!last) { toast("Nothing to undo"); return b; }
      if (last.kind === "s") return { ...b, strokes: b.strokes.filter(s => s.id !== last.id) };
      if (last.kind === "n") return { ...b, notes: b.notes.filter(n => n.id !== last.id) };
      return { ...b, uploads: b.uploads.filter(u => u.id !== last.id) };
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image uploads supported"); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 360;
        const scale = Math.min(1, maxW / img.width);
        const upload: Upload = {
          id: crypto.randomUUID(),
          x: 60 + Math.random() * 200, y: 60 + Math.random() * 200,
          w: img.width * scale, h: img.height * scale,
          name: file.name,
          dataUrl: reader.result as string,
          author: user.name, authorId: user.id,
          createdAt: new Date().toISOString(),
        };
        setBoard(b => ({ ...b, uploads: [...b.uploads, upload] }));
        toast.success(`Uploaded ${file.name}`);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onNotePointerDown = (e: React.PointerEvent, n: Note) => {
    if (tool !== "pan") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = getBoardPoint(e);
    setDraggingNote({ id: n.id, offX: p.x - n.x, offY: p.y - n.y });
  };
  const onUploadPointerDown = (e: React.PointerEvent, u: Upload) => {
    if (tool !== "pan") return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = getBoardPoint(e);
    setDraggingUpload({ id: u.id, offX: p.x - u.x, offY: p.y - u.y });
  };
  const onBoardPointerMove = (e: React.PointerEvent) => {
    if (draggingNote) {
      const p = getBoardPoint(e);
      updateNote(draggingNote.id, { x: p.x - draggingNote.offX, y: p.y - draggingNote.offY });
    } else if (draggingUpload) {
      const p = getBoardPoint(e);
      setBoard(b => ({ ...b, uploads: b.uploads.map(u => u.id === draggingUpload.id ? { ...u, x: p.x - draggingUpload.offX, y: p.y - draggingUpload.offY } : u) }));
    }
  };
  const onBoardPointerUp = () => { setDraggingNote(null); setDraggingUpload(null); };

  const exportPng = () => {
    const c = canvasRef.current; if (!c) return;
    // Render an offscreen canvas with notes/images too
    const off = document.createElement("canvas");
    off.width = CANVAS_W; off.height = CANVAS_H;
    const ctx = off.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(c, 0, 0);
    // notes
    for (const n of board.notes) {
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x, n.y, 180, 140);
      ctx.fillStyle = "#111";
      ctx.font = "14px Inter, sans-serif";
      wrapText(ctx, n.text || "(empty)", n.x + 10, n.y + 24, 160, 18);
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#374151";
      ctx.fillText(`${n.author} · ${format(new Date(n.createdAt), "MMM d HH:mm")}`, n.x + 10, n.y + 130);
    }
    const url = off.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = `whiteboard-${activeSemester.shortName}.png`;
    a.click();
  };

  const clearAll = () => {
    if (!isAdmin) return;
    if (!confirm("Clear the entire whiteboard for this semester? This cannot be undone.")) return;
    setBoard({ strokes: [], notes: [], uploads: [] });
    toast.success("Whiteboard cleared");
  };

  const itemCount = board.strokes.length + board.notes.length + board.uploads.length;
  const contributors = useMemo(() => {
    const set = new Set<string>();
    board.strokes.forEach(s => set.add(s.author));
    board.notes.forEach(n => set.add(n.author));
    board.uploads.forEach(u => set.add(u.author));
    return Array.from(set);
  }, [board]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
            <ToolButton active={tool === "pan"} onClick={() => setTool("pan")} label="Move / select"><Hand className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="Draw"><Pencil className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")} label="Erase strokes"><Eraser className="h-4 w-4" /></ToolButton>
            <ToolButton active={tool === "note"} onClick={() => setTool("note")} label="Add sticky note"><StickyNote className="h-4 w-4" /></ToolButton>
          </div>

          {tool === "pen" && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              {PEN_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setPenColor(c)}
                  className={`h-5 w-5 rounded-full border-2 ${penColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} aria-label={`Pen ${c}`} />
              ))}
              <div className="w-24 px-2">
                <Slider value={[penWidth]} min={1} max={12} step={1} onValueChange={(v) => setPenWidth(v[0])} />
              </div>
            </div>
          )}

          {tool === "note" && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
              {NOTE_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNoteColor(c)}
                  className={`h-5 w-5 rounded border-2 ${noteColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} aria-label={`Note ${c}`} />
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-1" /> Upload
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          <Button variant="ghost" size="sm" onClick={undo}><Undo2 className="h-4 w-4 mr-1" /> Undo</Button>
          <Button variant="ghost" size="sm" onClick={exportPng}><Download className="h-4 w-4 mr-1" /> Export</Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" className="text-destructive" onClick={clearAll}>
              <Trash2 className="h-4 w-4 mr-1" /> Clear board
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            {itemCount} items · {contributors.length} contributor{contributors.length === 1 ? "" : "s"} · {activeSemester.name}
          </div>
        </div>

        {/* Board */}
        <div
          ref={boardRef}
          className="relative overflow-auto bg-white dark:bg-slate-900"
          style={{ height: 600 }}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
        >
          <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="absolute inset-0"
              style={{ cursor: tool === "pen" || tool === "eraser" ? "crosshair" : tool === "note" ? "copy" : "default", touchAction: "none" }}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerLeave={onCanvasPointerUp}
            />

            {/* Uploads */}
            {board.uploads.map(u => {
              const canDelete = isAdmin || u.authorId === user?.id;
              return (
                <div key={u.id}
                  className="absolute group rounded-md shadow-md border border-border bg-background overflow-hidden"
                  style={{ left: u.x, top: u.y, width: u.w, height: u.h + 28, cursor: tool === "pan" ? "grab" : "default" }}
                  onPointerDown={(e) => onUploadPointerDown(e, u)}
                >
                  <img src={u.dataUrl} alt={u.name} style={{ width: u.w, height: u.h, display: "block" }} draggable={false} />
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] text-muted-foreground bg-muted/50">
                    <span className="truncate">{u.author} · {format(new Date(u.createdAt), "MMM d, h:mm a")}</span>
                    {canDelete && (
                      <button onClick={() => deleteUpload(u.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Notes */}
            {board.notes.map(n => {
              const canEdit = n.authorId === user?.id;
              const canDelete = isAdmin || n.authorId === user?.id;
              return (
                <div
                  key={n.id}
                  className="absolute group rounded-md shadow-md p-2 flex flex-col"
                  style={{ left: n.x, top: n.y, width: 180, height: 140, background: n.color, cursor: tool === "pan" ? "grab" : "default" }}
                  onPointerDown={(e) => onNotePointerDown(e, n)}
                >
                  {canEdit ? (
                    <Textarea
                      value={n.text}
                      onChange={(e) => updateNote(n.id, { text: e.target.value })}
                      onPointerDown={(e) => e.stopPropagation()}
                      placeholder="Write a note…"
                      className="flex-1 resize-none bg-transparent border-0 text-xs p-1 focus-visible:ring-0 text-slate-900 placeholder:text-slate-600"
                    />
                  ) : (
                    <div className="flex-1 text-xs whitespace-pre-wrap text-slate-900 p-1 overflow-auto">{n.text || <span className="text-slate-600 italic">(empty)</span>}</div>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-slate-700 truncate">
                      {n.author} · {format(new Date(n.createdAt), "MMM d, h:mm a")}
                    </span>
                    {canDelete && (
                      <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-destructive shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hint footer */}
        <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground flex items-center gap-2">
          <Plus className="h-3 w-3" />
          Pick a tool, then click on the board. Drag notes & images with the move tool. All items are tagged with your name and timestamp and shared with the cohort.
        </div>
      </CardContent>
    </Card>
  );
}

function ToolButton({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={`h-8 w-8 inline-flex items-center justify-center rounded ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
          aria-label={label}
          aria-pressed={active}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/);
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lineHeight;
      if (yy > y + 90) { ctx.fillText("…", x, yy); return; }
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
