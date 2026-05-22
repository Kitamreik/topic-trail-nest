import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Submissions() {
  const { students, assignments, submissions, grades } = useLMS();
  const { activeSemester } = useSemester();
  const [search, setSearch] = useState("");

  const semAssignments = assignments.filter(a => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map(a => a.id));

  // Build flat list of all submissions for this semester
  const allSubmissions = submissions
    .filter(s => semAssignmentIds.has(s.assignmentId))
    .map(s => {
      const student = students.find(st => st.id === s.studentId);
      const assignment = semAssignments.find(a => a.id === s.assignmentId);
      return { ...s, studentName: student?.name ?? "Unknown", studentEmail: student?.email ?? "", assignmentTitle: assignment?.title ?? "Unknown" };
    })
    .filter(s => s.studentName.toLowerCase().includes(search.toLowerCase()) || s.assignmentTitle.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Stats
  const semGrades = grades.filter(g => semAssignmentIds.has(g.assignmentId));
  const totalExpected = semGrades.length;
  const totalTurnedIn = semGrades.filter(g => g.turnedIn).length;
  const turnInRate = totalExpected > 0 ? Math.round((totalTurnedIn / totalExpected) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Submission History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cumulative submission records for {activeSemester.name}.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{allSubmissions.length}</p>
              <p className="text-xs text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-success">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{totalTurnedIn}/{totalExpected}</p>
              <p className="text-xs text-muted-foreground">Turned In</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-warning">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{turnInRate}%</p>
              <p className="text-xs text-muted-foreground">Turn-in Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">All Submissions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by student or assignment..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Submitted At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No submissions yet for {activeSemester.name}.
                  </TableCell>
                </TableRow>
              ) : (
                allSubmissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.studentName}</div>
                      <div className="text-[10px] text-muted-foreground">{s.studentEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.assignmentTitle}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{s.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(s.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
