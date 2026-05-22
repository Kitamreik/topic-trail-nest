import { useLMS } from "@/context/LMSContext";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import AdminAnalytics from "@/components/AdminAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Megaphone, MessageSquare, GraduationCap, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { usePullToRefresh, PullToRefreshIndicator } from "@/hooks/use-pull-to-refresh";
import { toast } from "sonner";

export default function Dashboard() {
  const { topics, announcements, discussions, assignments, grades } = useLMS();
  const { user, isAdmin } = useAuth();
  const { activeSemester } = useSemester();

  const semTopics = topics.filter(t => t.semesterId === activeSemester.id);
  const semAnnouncements = announcements.filter(a => a.semesterId === activeSemester.id);
  const semAssignments = assignments.filter(a => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map(a => a.id));
  const semGrades = grades.filter(g => semAssignmentIds.has(g.assignmentId));

  const turnedIn = semGrades.filter((g) => g.turnedIn).length;
  const turnInRate = semGrades.length > 0 ? Math.round((turnedIn / semGrades.length) * 100) : 0;

  const upcomingAssignments = semAssignments
    .filter((a) => new Date(a.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const recentAnnouncements = semAnnouncements.slice(0, 3);

  const stats = [
    { label: "Topics", value: semTopics.length, icon: BookOpen, color: "text-primary" },
    { label: "Announcements", value: semAnnouncements.length, icon: Megaphone, color: "text-warning" },
    { label: "Discussions", value: discussions.length, icon: MessageSquare, color: "text-secondary" },
    { label: "Turn-in Rate", value: `${turnInRate}%`, icon: GraduationCap, color: "text-success" },
  ];

  const { pull, refreshing, threshold } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Dashboard refreshed");
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} threshold={threshold} />
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Welcome back, {user?.name} — {activeSemester.name} overview.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines.</p>
            ) : (
              upcomingAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Max: {a.maxScore} pts</p>
                  </div>
                  <span className="text-xs font-medium text-warning">
                    {format(new Date(a.dueDate), "MMM d, h:mm a")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              recentAnnouncements.map((a) => (
                <Link key={a.id} to="/announcements" className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(a.createdAt), "MMM d, yyyy")}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && <AdminAnalytics />}
    </div>
  );
}
