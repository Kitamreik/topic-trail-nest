import { useState } from "react";
import { useLMS } from "@/context/LMSContext";
import { useSemester } from "@/context/SemesterContext";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { Clock, Megaphone, GraduationCap } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "deadline" | "announcement";
}

export default function CalendarView() {
  const { assignments, announcements } = useLMS();
  const { activeSemester } = useSemester();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const semAssignments = assignments.filter(a => a.semesterId === activeSemester.id);
  const semAnnouncements = announcements.filter(a => a.semesterId === activeSemester.id);

  const events: CalendarEvent[] = [
    ...semAssignments.map(a => ({
      id: a.id,
      title: a.title,
      date: new Date(a.dueDate),
      type: "deadline" as const,
    })),
    ...semAnnouncements.map(a => ({
      id: a.id,
      title: a.title,
      date: new Date(a.createdAt),
      type: "announcement" as const,
    })),
  ];

  const eventDates = events.map(e => e.date);

  const selectedEvents = selectedDate
    ? events.filter(e => isSameDay(e.date, selectedDate))
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assignment deadlines and announcements for {activeSemester.name}.
        </p>
      </div>

      <div className="grid md:grid-cols-[auto_1fr] gap-6">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="pointer-events-auto"
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{
                hasEvent: "bg-primary/20 text-primary font-bold rounded-md",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d, yyyy")
                : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No events on this date.</p>
            ) : (
              selectedEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${
                    event.type === "deadline"
                      ? "bg-warning/10 text-warning"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {event.type === "deadline" ? (
                      <GraduationCap className="h-4 w-4" />
                    ) : (
                      <Megaphone className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          event.type === "deadline"
                            ? "border-warning text-warning"
                            : "border-primary text-primary"
                        }`}
                      >
                        {event.type === "deadline" ? "Due Date" : "Announcement"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(event.date, "h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* All upcoming events list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">All Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {events
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedDate(event.date)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${
                    event.type === "deadline"
                      ? "bg-warning/10 text-warning"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {event.type === "deadline" ? (
                      <GraduationCap className="h-3.5 w-3.5" />
                    ) : (
                      <Megaphone className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{event.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(event.date, "MMM d, yyyy")}
                </span>
              </div>
            ))}
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No events this semester.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
