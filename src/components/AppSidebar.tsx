import { NavLink as RRNavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Megaphone,
  MessageSquare,
  GraduationCap,
  Shield,
  Calendar,
  LogOut,
  ChevronDown,
  User,
  Users,
  Bell,
  FileText,
  FolderOpen,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Topics", url: "/topics", icon: BookOpen },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Discussions", url: "/discussions", icon: MessageSquare },
  { title: "Grades", url: "/grades", icon: GraduationCap },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "File Vault", url: "/vault", icon: FolderOpen },
  { title: "Exams", url: "/exams", icon: ClipboardList },
  { title: "Messages", url: "/chat", icon: MessageCircle },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "My Profile", url: "/profile", icon: User },
];

const adminNav = [
  { title: "Admin Console", url: "/admin", icon: Shield },
  { title: "Submissions", url: "/submissions", icon: FileText },
];

const webmasterNav = [
  { title: "User Management", url: "/webmaster", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, isAdmin, isWebmaster, logout } = useAuth();
  const { semesters, activeSemester, setActiveSemesterId } = useSemester();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar flex flex-col">
        <div className="px-4 py-5">
          {!collapsed && (
            <h1 className="font-display text-lg font-bold text-sidebar-foreground tracking-tight">
              Academic Stream
            </h1>
          )}
          {collapsed && (
            <span className="font-display text-lg font-bold text-sidebar-foreground">AS</span>
          )}
        </div>

        {/* Semester Selector */}
        <div className="px-3 mb-2">
          {!collapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground text-sm h-9 px-3">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {activeSemester.name}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {semesters.map((sem) => (
                  <DropdownMenuItem
                    key={sem.id}
                    onClick={() => setActiveSemesterId(sem.id)}
                    className={sem.id === activeSemester.id ? "bg-accent" : ""}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    {sem.name}
                    {sem.id === activeSemester.id && (
                      <Badge variant="outline" className="ml-auto text-[9px] h-4">Active</Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/90 hover:bg-sidebar-accent/50">
                  <Calendar className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {semesters.map((sem) => (
                  <DropdownMenuItem
                    key={sem.id}
                    onClick={() => setActiveSemesterId(sem.id)}
                    className={sem.id === activeSemester.id ? "bg-accent" : ""}
                  >
                    {sem.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-body">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <RRNavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </RRNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-body">
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RRNavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </RRNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isWebmaster && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-body">
              Webmaster
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {webmasterNav.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <RRNavLink
                        to={item.url}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          }`
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </RRNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* User info + logout at bottom */}
        <div className="mt-auto border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-sidebar-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user?.role}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
