import { useState, useRef } from "react";
import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { FilePreview } from "@/components/FilePreview";
import { GoogleDrivePicker, DriveFile } from "@/components/GoogleDrivePicker";

export default function Grades() {
  const { students, assignments, grades, submissions, addSubmission } = useLMS();
  const { user, isStudent } = useAuth();
  const { activeSemester } = useSemester();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitDialog, setSubmitDialog] = useState<{ assignmentId: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [driveFile, setDriveFile] = useState<DriveFile | null>(null);

  const filteredAssignments = assignments.filter(a => a.semesterId === activeSemester.id);

  const getGrade = (studentId: string, assignmentId: string) =>
    grades.find((g) => g.studentId === studentId && g.assignmentId === assignmentId);

  const getSubmissions = (studentId: string, assignmentId: string) =>
    submissions.filter(s => s.studentId === studentId && s.assignmentId === assignmentId);

  const visibleStudents = isStudent
    ? students.filter((s) => s.name === user?.name || s.email === user?.email)
    : students;

  // Find student ID for the logged-in student
  const myStudentId = isStudent
    ? students.find(s => s.name === user?.name || s.email === user?.email)?.id
    : null;

  const handleSubmit = () => {
    if (!submitDialog || !myStudentId) return;
    if (selectedFile) {
      addSubmission({
        studentId: myStudentId,
        assignmentId: submitDialog.assignmentId,
        fileName: selectedFile.name,
        fileUrl: URL.createObjectURL(selectedFile),
      });
    } else if (driveFile) {
      addSubmission({
        studentId: myStudentId,
        assignmentId: submitDialog.assignmentId,
        fileName: `${driveFile.name} (Google Drive)`,
        fileUrl: `https://drive.google.com/file/d/${driveFile.id}/view`,
      });
    } else {
      return;
    }
    toast.success("Assignment submitted successfully!");
    setSelectedFile(null);
    setDriveFile(null);
    setSubmitDialog(null);
  };

  const handleDrivePick = (file: DriveFile) => {
    setDriveFile(file);
    setSelectedFile(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Grades</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isStudent ? `Your scores for ${activeSemester.name}.` : `All student scores for ${activeSemester.name}.`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {!isStudent && <TableHead className="min-w-[160px]">Student</TableHead>}
                {filteredAssignments.map((a) => (
                  <TableHead key={a.id} className="min-w-[140px] text-center">
                    <div>{a.title}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">Max: {a.maxScore}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={filteredAssignments.length + 1} className="text-center text-muted-foreground py-8">
                    No grade data found for your account.
                  </TableCell>
                </TableRow>
              ) : (
                visibleStudents.map((s) => (
                  <TableRow key={s.id}>
                    {!isStudent && <TableCell className="font-medium">{s.name}</TableCell>}
                    {filteredAssignments.map((a) => {
                      const g = getGrade(s.id, a.id);
                      const subs = getSubmissions(s.id, a.id);
                      const isMyRow = s.id === myStudentId;
                      return (
                        <TableCell key={a.id} className="text-center">
                          {g?.turnedIn ? (
                            <div className="space-y-1">
                              <div>
                                <span className="font-semibold">{g.score ?? "—"}</span>
                                <span className="text-muted-foreground text-xs">/{a.maxScore}</span>
                                <Badge variant="outline" className="ml-2 text-[10px] border-success text-success">
                                  Turned In
                                </Badge>
                              </div>
                              {subs.length > 0 && (
                                <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                                  <FilePreview
                                    fileName={subs[subs.length - 1].fileName}
                                    fileUrl={subs[subs.length - 1].fileUrl}
                                    trigger={
                                      <span className="flex items-center gap-1 hover:text-primary transition-colors">
                                        <FileText className="h-3 w-3" />
                                        {subs[subs.length - 1].fileName}
                                      </span>
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-[10px] border-destructive text-destructive">
                                Missing
                              </Badge>
                              {isStudent && isMyRow && (
                                <div>
                                  <Button
                                    variant="outline" size="sm"
                                    className="text-[10px] h-6 mt-1"
                                    onClick={() => setSubmitDialog({ assignmentId: a.id })}
                                  >
                                    <Upload className="h-3 w-3 mr-1" /> Submit
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submission Dialog */}
      <Dialog open={!!submitDialog} onOpenChange={(o) => { if (!o) { setSubmitDialog(null); setSelectedFile(null); setDriveFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a file from your device or pick one from Google Drive.
            </p>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a file from your device</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setDriveFile(null); }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setDrivePickerOpen(true)}
            >
              <HardDrive className="h-4 w-4" />
              {driveFile ? (
                <span className="truncate flex-1 text-left">
                  <CheckCircle className="inline h-3.5 w-3.5 text-success mr-1" />
                  {driveFile.name}
                </span>
              ) : (
                "Choose from Google Drive"
              )}
            </Button>

            <Button onClick={handleSubmit} disabled={!selectedFile && !driveFile} className="w-full">
              Submit Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GoogleDrivePicker
        open={drivePickerOpen}
        onOpenChange={setDrivePickerOpen}
        onPick={handleDrivePick}
      />
    </div>
  );
}
