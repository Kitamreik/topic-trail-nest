import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/GlobalSearch";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuth } from "@/context/AuthContext";
import { useSemester } from "@/context/SemesterContext";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { activeSemester } = useSemester();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Hide sidebar on mobile — bottom nav replaces it */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-3 sm:px-4 bg-card shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden md:flex" />
              <Badge variant="outline" className="text-[10px] sm:text-xs font-normal">
                {activeSemester.name}
              </Badge>
            </div>

            {/* Desktop search */}
            <div className="hidden md:block flex-1 max-w-sm mx-4">
              <GlobalSearch />
            </div>

            {/* Mobile search toggle */}
            <div className="flex md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              >
                {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs text-muted-foreground hidden lg:block">
                {user?.name} <span className="capitalize">({user?.role})</span>
              </span>
              <ThemeToggle />
              <NotificationPanel />
            </div>
          </header>

          {/* Mobile search bar (collapsible) */}
          {mobileSearchOpen && (
            <div className="md:hidden border-b border-border px-3 py-2 bg-card">
              <GlobalSearch />
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
