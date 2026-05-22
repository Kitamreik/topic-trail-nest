import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, MessageCircle, Send, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";

export default function Discussions() {
  const { discussions, addDiscussion, addReply, updateReply, deleteDiscussion } = useLMS();
  const { user, isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<{ discussionId: string; replyId: string } | null>(null);
  const [editReplyText, setEditReplyText] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !user) return;
    addDiscussion({ title: title.trim(), body: body.trim(), author: user.name, authorId: user.id });
    setTitle(""); setBody(""); setDialogOpen(false);
  };

  const handleReply = (discussionId: string) => {
    const text = replyMap[discussionId]?.trim();
    if (!text || !user) return;
    addReply(discussionId, { body: text, author: user.name, authorId: user.id });
    setReplyMap((p) => ({ ...p, [discussionId]: "" }));
  };

  const startEditReply = (discussionId: string, replyId: string, currentBody: string) => {
    setEditingReply({ discussionId, replyId });
    setEditReplyText(currentBody);
  };

  const saveEditReply = () => {
    if (!editingReply || !editReplyText.trim()) return;
    updateReply(editingReply.discussionId, editingReply.replyId, editReplyText.trim());
    setEditingReply(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-bold">Discussions</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Engage with your classmates.</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">New Discussion</span><span className="sm:hidden">New</span></Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start a Discussion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Discussion title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="What's on your mind?" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <Button onClick={handleCreate} className="w-full">Post Discussion</Button>
          </div>
        </DialogContent>
      </Dialog>

      {discussions.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No discussions yet. Start one!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {discussions.map((d) => (
            <Card key={d.id} className="group">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                    <h3 className="font-display font-semibold text-sm">{d.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {d.author} · {format(new Date(d.createdAt), "MMM d, yyyy")} · {d.replies.length} {d.replies.length === 1 ? "reply" : "replies"}
                    </p>
                  </div>
                  {/* Only admin can delete discussions */}
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDiscussion(d.id)}><Trash2 className="h-3 w-3" /></Button>
                      </TooltipTrigger><TooltipContent>Delete discussion</TooltipContent></Tooltip>
                    </div>
                  )}
                </div>
                {d.body && <p className="text-sm mt-2 text-foreground/90">{d.body}</p>}

                {expandedId === d.id && (
                  <div className="mt-4 space-y-3 border-t border-border pt-3">
                    {d.replies.map((r) => {
                      const isEditingThis = editingReply?.discussionId === d.id && editingReply?.replyId === r.id;
                      const canEdit = user?.id === r.authorId;
                      return (
                        <div key={r.id} className="flex gap-3 items-start group/reply">
                          <MessageCircle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            {isEditingThis ? (
                              <div className="flex gap-2 items-center">
                                <Input
                                  value={editReplyText}
                                  onChange={(e) => setEditReplyText(e.target.value)}
                                  onKeyDown={(e) => e.key === "Enter" && saveEditReply()}
                                  className="flex-1 h-8 text-sm"
                                  autoFocus
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={saveEditReply}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingReply(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm">{r.body}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-muted-foreground">{r.author} · {format(new Date(r.createdAt), "MMM d, h:mm a")}</p>
                                  {canEdit && (
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-5 w-5 opacity-0 group-hover/reply:opacity-100 transition-opacity"
                                      onClick={() => startEditReply(d.id, r.id, r.body)}
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Write a reply..."
                        className="flex-1"
                        value={replyMap[d.id] || ""}
                        onChange={(e) => setReplyMap((p) => ({ ...p, [d.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleReply(d.id)}
                      />
                      <Button size="icon" onClick={() => handleReply(d.id)}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
