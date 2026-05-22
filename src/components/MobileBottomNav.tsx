import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Calendar,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { hapticTick, hapticTap } from "@/lib/haptics";
import { useAuth } from "@/context/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Megaphone,
  MessageSquare,
  FolderOpen,
  ClipboardList,
  Bell,
  User,
  Shield,
  FileText,
  Users,
} from "lucide-react";

const primaryTabs = [
  { title: "Home", url: "/dashboard", icon: LayoutDashboard },
  { title: "Topics", url: "/topics", icon: BookOpen },
  { title: "Grades", url: "/grades", icon: GraduationCap },
  { title: "Calendar", url: "/calendar", icon: Calendar },
];

const moreItems = [
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Discussions", url: "/discussions", icon: MessageSquare },
  { title: "File Vault", url: "/vault", icon: FolderOpen },
  { title: "Exams", url: "/exams", icon: ClipboardList },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "My Profile", url: "/profile", icon: User },
];

const adminMore = [
  { title: "Admin Console", url: "/admin", icon: Shield },
  { title: "Submissions", url: "/submissions", icon: FileText },
];

const webmasterMore = [
  { title: "User Management", url: "/webmaster", icon: Users },
];

export function MobileBottomNav() {
  const { isAdmin, isWebmaster } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const allMore = [
    ...moreItems,
    ...(isAdmin ? adminMore : []),
    ...(isWebmaster ? webmasterMore : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {primaryTabs.map((tab) => {
          const isActive = location.pathname === tab.url;
          return (
            <NavLink
              key={tab.url}
              to={tab.url}
              onClick={() => { if (!isActive) hapticTick(); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.title}</span>
            </NavLink>
          );
        })}

        {/* More menu */}
        <Sheet open={open} onOpenChange={(o) => { if (o) hapticTap(); setOpen(o); }}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium text-muted-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader>
              <SheetTitle className="text-left">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {allMore.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    onClick={() => { hapticTick(); setOpen(false); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-center leading-tight">{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
