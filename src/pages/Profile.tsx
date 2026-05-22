import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { User, FileText, GraduationCap, Save, TrendingUp, Vibrate } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { getHapticsEnabled, setHapticsEnabled, hapticTap } from "@/lib/haptics";

const PROFILE_KEY = "academic-stream-profile";

export default function Profile() {
  const { user } = useAuth();
  const { students, assignments, grades, submissions } = useLMS();
  const { activeSemester } = useSemester();

  // Find student record
  const student = students.find(s => s.email === user?.email || s.name === user?.name);
  const studentId = student?.id;

  // Profile editing
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [bio, setBio] = useState("");

  // Haptics preference
  const [haptics, setHaptics] = useState(getHapticsEnabled());

  const handleHapticsToggle = (enabled: boolean) => {
    setHaptics(enabled);
    setHapticsEnabled(enabled);
    if (enabled) {
      // Confirmation buzz so the user feels it working.
      hapticTap();
    }
    toast.success(enabled ? "Haptic feedback enabled" : "Haptic feedback disabled");
  };

  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`${PROFILE_KEY}-${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDisplayName(parsed.displayName ?? user.name);
        setBio(parsed.bio ?? "");
      } else {
        setDisplayName(user.name);
      }
    } catch {
      setDisplayName(user.name);
    }
  }, [user]);

  const handleSaveProfile = () => {
    if (!user) return;
    localStorage.setItem(`${PROFILE_KEY}-${user.id}`, JSON.stringify({ displayName, bio }));
    toast.success("Profile updated!");
  };

  // Semester-filtered data
  const semAssignments = assignments.filter(a => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map(a => a.id));

  const myGrades = studentId
    ? grades.filter(g => g.studentId === studentId && semAssignmentIds.has(g.assignmentId))
    : [];

  const mySubmissions = studentId
    ? submissions
        .filter(s => s.studentId === studentId && semAssignmentIds.has(s.assignmentId))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    : [];

  // Grade summary
  const gradedItems = myGrades.filter(g => g.score !== null);
  const totalScore = gradedItems.reduce((sum, g) => sum + (g.score ?? 0), 0);
  const totalMax = gradedItems.reduce((sum, g) => {
    const assignment = semAssignments.find(a => a.id === g.assignmentId);
    return sum + (assignment?.maxScore ?? 0);
  }, 0);
  const avgPercent = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const turnedIn = myGrades.filter(g => g.turnedIn).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and view your academic summary for {activeSemester.name}.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base">{user?.name}</CardTitle>
              <CardDescription>{user?.email} · <span className="capitalize">{user?.role}</span></CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="opacity-60" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input id="bio" placeholder="Tell us about yourself..." value={bio} onChange={e => setBio(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} size="sm">
            <Save className="h-4 w-4 mr-1" /> Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Vibrate className="h-4 w-4 text-primary" /> Preferences
          </CardTitle>
          <CardDescription>Personalize how the app responds to your interactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
            <div className="space-y-0.5 min-w-0">
              <Label htmlFor="haptics-toggle" className="font-medium">Haptic feedback</Label>
              <p className="text-xs text-muted-foreground">
                Vibrate on swipes, taps, and confirmations. Mobile devices only.
              </p>
            </div>
            <Switch
              id="haptics-toggle"
              checked={haptics}
              onCheckedChange={handleHapticsToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grade Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{avgPercent}%</p>
              <p className="text-xs text-muted-foreground">Average</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-success">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{gradedItems.length}</p>
              <p className="text-xs text-muted-foreground">Graded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-warning">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{turnedIn}/{myGrades.length}</p>
              <p className="text-xs text-muted-foreground">Turned In</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted text-secondary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{mySubmissions.length}</p>
              <p className="text-xs text-muted-foreground">Submissions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Grade Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myGrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No grades yet.</TableCell>
                </TableRow>
              ) : (
                myGrades.map(g => {
                  const a = semAssignments.find(a => a.id === g.assignmentId);
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{a?.title ?? "Unknown"}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">{g.score ?? "—"}</span>
                        <span className="text-muted-foreground text-xs">/{a?.maxScore}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {g.turnedIn ? (
                          <Badge variant="outline" className="text-[10px] border-success text-success">Turned In</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-destructive text-destructive">Missing</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submission History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Submission History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No submissions yet.</TableCell>
                </TableRow>
              ) : (
                mySubmissions.map(s => {
                  const a = semAssignments.find(a => a.id === s.assignmentId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{a?.title ?? "Unknown"}</Badge>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
