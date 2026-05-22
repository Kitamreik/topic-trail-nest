import { useState } from "react";
import { Bell, X, Check } from "lucide-react";
import { useLMS } from "@/context/LMSContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const { notifications, markNotificationRead, clearNotifications } = useLMS();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-destructive text-destructive-foreground">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/10" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border-l border-border shadow-xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-semibold">Notifications</h2>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearNotifications}>
                    <Check className="h-4 w-4 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground text-sm">No notifications</p>
              ) : (
                <ul>
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${
                        !n.read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => markNotificationRead(n.id)}
                    >
                      <div className="flex items-start gap-3">
                        {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(n.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
