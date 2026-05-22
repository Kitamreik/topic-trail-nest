import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(210 70% 55%)",
  "hsl(340 65% 55%)",
];

type DateRange = { from: Date; to: Date };

export default function AdminAnalytics() {
  const { assignments, grades, submissions, discussions } = useLMS();
  const { activeSemester } = useSemester();

  const [activeGradeBucket, setActiveGradeBucket] = useState<string | null>(null);
  const [activeEngagement, setActiveEngagement] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(startOfDay(new Date()), 13),
    to: startOfDay(new Date()),
  });

  const semAssignments = assignments.filter((a) => a.semesterId === activeSemester.id);
  const semAssignmentIds = new Set(semAssignments.map((a) => a.id));
  const semGrades = grades.filter((g) => semAssignmentIds.has(g.assignmentId));
  const semSubmissions = submissions.filter((s) => semAssignmentIds.has(s.assignmentId));

  // --- Grade Distribution ---
  const gradeBuckets = [
    { range: "A (90-100)", min: 90, max: 100, count: 0 },
    { range: "B (80-89)", min: 80, max: 89, count: 0 },
    { range: "C (70-79)", min: 70, max: 79, count: 0 },
    { range: "D (60-69)", min: 60, max: 69, count: 0 },
    { range: "F (<60)", min: 0, max: 59, count: 0 },
  ];

  semGrades.forEach((g) => {
    if (g.score === null) return;
    const assignment = semAssignments.find((a) => a.id === g.assignmentId);
    if (!assignment || assignment.maxScore === 0) return;
    const pct = Math.round((g.score / assignment.maxScore) * 100);
    const bucket = gradeBuckets.find((b) => pct >= b.min && pct <= b.max);
    if (bucket) bucket.count++;
  });

  const gradeData = gradeBuckets.map((b) => ({
    name: b.range,
    count: b.count,
    fill: activeGradeBucket === null || activeGradeBucket === b.range
      ? "hsl(var(--primary))"
      : "hsl(var(--muted))",
  }));

  const gradeConfig: ChartConfig = {
    count: { label: "Students", color: "hsl(var(--primary))" },
  };

  // --- Filtered grade details ---
  const filteredGradeStudents = activeGradeBucket
    ? semGrades.filter((g) => {
        if (g.score === null) return false;
        const assignment = semAssignments.find((a) => a.id === g.assignmentId);
        if (!assignment || assignment.maxScore === 0) return false;
        const pct = Math.round((g.score / assignment.maxScore) * 100);
        const bucket = gradeBuckets.find((b) => b.range === activeGradeBucket);
        return bucket && pct >= bucket.min && pct <= bucket.max;
      })
    : [];

  // --- Submission Trends (date range) ---
  const daysDiff = Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const submissionTrend = Array.from({ length: daysDiff }, (_, i) => {
    const day = new Date(dateRange.from.getTime() + i * 24 * 60 * 60 * 1000);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = semSubmissions.filter(
      (s) => format(new Date(s.submittedAt), "yyyy-MM-dd") === dayStr
    ).length;
    return { date: format(day, "MMM d"), submissions: count };
  });

  const submissionConfig: ChartConfig = {
    submissions: { label: "Submissions", color: "hsl(var(--primary))" },
  };

  // --- Engagement ---
  const totalPosts = discussions.length;
  const totalReplies = discussions.reduce((sum, d) => sum + d.replies.length, 0);
  const turnedIn = semGrades.filter((g) => g.turnedIn).length;
  const notTurnedIn = semGrades.length - turnedIn;

  const engagementData = [
    { name: "Discussion Posts", value: totalPosts },
    { name: "Replies", value: totalReplies },
    { name: "Submitted", value: turnedIn },
    { name: "Missing", value: notTurnedIn },
  ];

  const engagementConfig: ChartConfig = {
    value: { label: "Count" },
  };

  const handleGradeClick = (data: any) => {
    if (data?.activeLabel) {
      setActiveGradeBucket(prev => prev === data.activeLabel ? null : data.activeLabel);
    }
  };

  const handlePieClick = (_: any, index: number) => {
    const name = engagementData[index]?.name;
    setActiveEngagement(prev => prev === name ? null : name);
  };

  const presetRanges = [
    { label: "7 days", days: 6 },
    { label: "14 days", days: 13 },
    { label: "30 days", days: 29 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-lg font-bold">Analytics</h2>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Grade Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Grade Distribution</CardTitle>
              {activeGradeBucket && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setActiveGradeBucket(null)}>
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            {activeGradeBucket && (
              <Badge variant="secondary" className="text-xs w-fit">{activeGradeBucket}: {filteredGradeStudents.length} entries</Badge>
            )}
          </CardHeader>
          <CardContent>
            <ChartContainer config={gradeConfig} className="h-[220px] w-full">
              <BarChart data={gradeData} onClick={handleGradeClick} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {gradeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} className="cursor-pointer transition-colors" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Click a bar to filter</p>
          </CardContent>
        </Card>

        {/* Submission Trends */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Submission Trends</CardTitle>
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {presetRanges.map((p) => (
                <Button
                  key={p.days}
                  variant={daysDiff - 1 === p.days ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setDateRange({ from: subDays(startOfDay(new Date()), p.days), to: startOfDay(new Date()) })}
                >
                  {p.label}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                    <CalendarIcon className="h-3 w-3 mr-1" /> Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ from: startOfDay(range.from), to: startOfDay(range.to) });
                      }
                    }}
                    numberOfMonths={1}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={submissionConfig} className="h-[220px] w-full">
              <LineChart data={submissionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="var(--color-submissions)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {format(dateRange.from, "MMM d")} — {format(dateRange.to, "MMM d, yyyy")}
            </p>
          </CardContent>
        </Card>

        {/* Student Engagement */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Student Engagement</CardTitle>
              {activeEngagement && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setActiveEngagement(null)}>
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            {activeEngagement && (
              <Badge variant="secondary" className="text-xs w-fit">
                {activeEngagement}: {engagementData.find(e => e.name === activeEngagement)?.value ?? 0}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <ChartContainer config={engagementConfig} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie
                  data={engagementData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  className="cursor-pointer"
                >
                  {engagementData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      opacity={activeEngagement === null || activeEngagement === entry.name ? 1 : 0.3}
                      className="cursor-pointer transition-opacity"
                      onClick={() => handlePieClick(null, i)}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">Click a segment to highlight</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
