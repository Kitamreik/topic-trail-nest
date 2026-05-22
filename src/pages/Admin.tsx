import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Cell,
} from "recharts";
import { Users, CheckCircle, MessageSquare, BookOpen, Search, Pencil, Trash2, Save, X } from "lucide-react";

export default function Admin() {
  const {
    students, assignments, grades, discussions, topics,
    updateGrade, deleteTopic, deleteAnnouncement,
    announcements,
  } = useLMS();
  const { activeSemester } = useSemester();

  const [search, setSearch] = useState("");
  const [editingGrade, setEditingGrade] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editScore, setEditScore] = useState("");

  // Filter by semester
  const semTopics = topics.filter(t => t.semesterId === activeSemester.id);
  const semAnnouncements = announcements.filter(a => a.semesterId === activeSemester.id);
  const semAssignments = assignments.filter(a => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map(a => a.id));
  const semGrades = grades.filter(g => semAssignmentIds.has(g.assignmentId));

  // Metrics
  const turnedIn = semGrades.filter((g) => g.turnedIn).length;
  const turnInRate = semGrades.length > 0 ? Math.round((turnedIn / semGrades.length) * 100) : 0;

  const totalReplies = discussions.reduce((sum, d) => sum + d.replies.length, 0);
  const avgReplies = discussions.length > 0 ? (totalReplies / discussions.length).toFixed(1) : "0";

  // Chart data
  const chartData = semAssignments.map((a) => {
    const aGrades = grades.filter((g) => g.assignmentId === a.id);
    const turned = aGrades.filter((g) => g.turnedIn).length;
    const rate = aGrades.length > 0 ? Math.round((turned / aGrades.length) * 100) : 0;
    return { name: a.title, rate };
  });

  const discChart = discussions.map((d) => ({
    name: d.title.length > 20 ? d.title.slice(0, 20) + "…" : d.title,
    replies: d.replies.length,
  }));

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (studentId: string, assignmentId: string, currentScore: number | null) => {
    setEditingGrade({ studentId, assignmentId });
    setEditScore(currentScore?.toString() ?? "");
  };

  const saveEdit = () => {
    if (!editingGrade) return;
    const score = parseInt(editScore);
    if (isNaN(score) || score < 0) return;
    updateGrade(editingGrade.studentId, editingGrade.assignmentId, score);
    setEditingGrade(null);
  };

  const getGrade = (studentId: string, assignmentId: string) =>
    grades.find((g) => g.studentId === studentId && g.assignmentId === assignmentId);

  const statCards = [
    { label: "Students", value: students.length, icon: Users, accent: "text-primary" },
    { label: "Turn-in Rate", value: `${turnInRate}%`, icon: CheckCircle, accent: "text-success" },
    { label: "Avg Replies", value: avgReplies, icon: MessageSquare, accent: "text-warning" },
    { label: "Active Topics", value: semTopics.length, icon: BookOpen, accent: "text-secondary" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage grades, content, and view engagement metrics for {activeSemester.name}.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Turn-in Rate by Assignment</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <RTooltip />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--primary))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Discussion Engagement</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={discChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="replies" radius={[4, 4, 0, 0]}>
                  {discChart.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--accent))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">Student Grades</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Student</TableHead>
                {semAssignments.map((a) => (
                  <TableHead key={a.id} className="min-w-[140px] text-center">
                    <div>{a.title}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Max: {a.maxScore}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-muted-foreground">{s.email}</div>
                  </TableCell>
                  {semAssignments.map((a) => {
                    const g = getGrade(s.id, a.id);
                    const isEditing = editingGrade?.studentId === s.id && editingGrade?.assignmentId === a.id;
                    return (
                      <TableCell key={a.id} className="text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              className="w-16 h-7 text-center text-sm"
                              value={editScore}
                              onChange={(e) => setEditScore(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={saveEdit}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGrade(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold">{g?.score ?? "—"}</span>
                            {g?.turnedIn ? (
                              <Badge variant="outline" className="text-[10px] border-success text-success">In</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-destructive text-destructive">Missing</Badge>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(s.id, a.id, g?.score ?? null)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit grade</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Manage Topics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {semTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topics for {activeSemester.name}.</p>
            ) : (
              semTopics.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.content.length} items</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTopic(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete topic</TooltipContent>
                  </Tooltip>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Manage Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {semAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements for {activeSemester.name}.</p>
            ) : (
              semAnnouncements.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteAnnouncement(a.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete announcement</TooltipContent>
                  </Tooltip>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
