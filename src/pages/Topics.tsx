import { useState, useRef } from "react";
import { useLMS, type ContentItem } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Link as LinkIcon, FileText, Image, Type, Trash2, ExternalLink, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Topics() {
  const { topics, addTopic, addContentToTopic, removeContentFromTopic, reorderTopics, reorderContent } = useLMS();
  const { isAdmin } = useAuth();
  const { activeSemester } = useSemester();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  const [contentDialogOpen, setContentDialogOpen] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentItem["type"]>("link");
  const [contentTitle, setContentTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [contentDesc, setContentDesc] = useState("");

  // Drag state
  const dragTopicIdx = useRef<number | null>(null);
  const dragContentIdx = useRef<{ topicId: string; idx: number } | null>(null);

  const filteredTopics = topics.filter(t => t.semesterId === activeSemester.id);

  const handleAddTopic = () => {
    if (!newTitle.trim()) return;
    addTopic({ title: newTitle.trim(), description: newDesc.trim(), semesterId: activeSemester.id });
    setNewTitle("");
    setNewDesc("");
    setTopicDialogOpen(false);
  };

  const handleAddContent = (topicId: string) => {
    if (!contentTitle.trim()) return;
    addContentToTopic(topicId, {
      type: contentType,
      title: contentTitle.trim(),
      url: contentUrl.trim() || undefined,
      description: contentDesc.trim() || undefined,
    });
    setContentTitle("");
    setContentUrl("");
    setContentDesc("");
    setContentType("link");
    setContentDialogOpen(null);
  };

  const typeIcon = (type: ContentItem["type"]) => {
    switch (type) {
      case "link": return <LinkIcon className="h-4 w-4 text-primary" />;
      case "pdf": return <FileText className="h-4 w-4 text-destructive" />;
      case "image": return <Image className="h-4 w-4 text-success" />;
      case "text": return <Type className="h-4 w-4 text-secondary" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Topics</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse course topics and materials for {activeSemester.name}.</p>
        </div>
        {isAdmin && (
          <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Topic</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Topic</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Topic title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <Textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                <Button onClick={handleAddTopic} className="w-full">Create Topic</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {filteredTopics.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No topics for {activeSemester.name}.</CardContent></Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filteredTopics.map((topic, topicIdx) => (
            <AccordionItem
              key={topic.id}
              value={topic.id}
              className="border rounded-lg bg-card px-4"
              draggable={isAdmin}
              onDragStart={(e) => {
                if (!isAdmin) return;
                dragTopicIdx.current = topicIdx;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("type", "topic");
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragTopicIdx.current !== null && dragTopicIdx.current !== topicIdx) {
                  reorderTopics(activeSemester.id, dragTopicIdx.current, topicIdx);
                }
                dragTopicIdx.current = null;
              }}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  {isAdmin && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />}
                  <div>
                    <p className="font-display font-semibold text-sm">{topic.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-2">
                  {topic.content.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No content added yet.</p>
                  )}
                  {topic.content.map((c, cIdx) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50 group"
                      draggable={isAdmin}
                      onDragStart={(e) => {
                        if (!isAdmin) return;
                        e.stopPropagation();
                        dragContentIdx.current = { topicId: topic.id, idx: cIdx };
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("type", "content");
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragContentIdx.current && dragContentIdx.current.topicId === topic.id && dragContentIdx.current.idx !== cIdx) {
                          reorderContent(topic.id, dragContentIdx.current.idx, cIdx);
                        }
                        dragContentIdx.current = null;
                      }}
                    >
                      {isAdmin && <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />}
                      {typeIcon(c.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                        <p className="text-[10px] text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.url && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild className="h-7 w-7">
                                <a href={c.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open link</TooltipContent>
                          </Tooltip>
                        )}
                        {isAdmin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeContentFromTopic(topic.id, c.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete content</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                  {isAdmin && (
                    <Dialog open={contentDialogOpen === topic.id} onOpenChange={(o) => setContentDialogOpen(o ? topic.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2"><Plus className="h-3 w-3 mr-1" /> Add Content</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Content to {topic.title}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Select value={contentType} onValueChange={(v) => setContentType(v as ContentItem["type"])}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="link">Link</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                              <SelectItem value="text">Text Note</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Title" value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} />
                          {(contentType === "link" || contentType === "pdf" || contentType === "image") && (
                            <Input placeholder="URL" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                          )}
                          <Textarea placeholder="Description (optional)" value={contentDesc} onChange={(e) => setContentDesc(e.target.value)} />
                          <Button onClick={() => handleAddContent(topic.id)} className="w-full">Add Content</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
