import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, MessageCircle, Bell, BarChart3, Calendar, FolderOpen, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  { icon: BookOpen, title: "Course Topics", desc: "Organized course materials with rich content and file attachments." },
  { icon: MessageCircle, title: "Discussions", desc: "Engage with peers and instructors in threaded discussions." },
  { icon: Bell, title: "Announcements", desc: "Stay informed with real-time course announcements and alerts." },
  { icon: BarChart3, title: "Grades & Submissions", desc: "Track your grades and submit assignments with file uploads." },
  { icon: Calendar, title: "Calendar", desc: "View due dates, exams, and important events at a glance." },
  { icon: FolderOpen, title: "File Vault", desc: "Store and organize your course files, links, and resources." },
  { icon: Shield, title: "Secure Access", desc: "Two-factor authentication keeps your account protected." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Academic Stream</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/login")}>
              <span className="sm:hidden">Sign In</span>
              <span className="hidden sm:inline">Get Started</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
            <GraduationCap className="h-4 w-4" />
            Learning Management System
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Your Academic Journey,{" "}
            <span className="text-primary">Streamlined</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Access course materials, submit assignments, engage in discussions, and track your progress — all in one place.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/login")}>
              Sign In to Your Account
            </Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-10 text-foreground">Everything You Need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {features.map((f) => (
              <Card key={f.title} className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="pt-6 space-y-2">
                  <f.icon className="h-8 w-8 text-primary" />
                  <h3 className="font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo accounts */}
      <section className="pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-md mx-auto">
          <Card className="border-border">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-center text-foreground">Try the Demo</h3>
              <p className="text-sm text-muted-foreground text-center">
                Explore the platform using pre-configured demo accounts.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="flex flex-col h-auto py-3" onClick={() => navigate("/login")}>
                  <span className="text-sm font-medium">Admin</span>
                  <span className="text-[10px] text-muted-foreground">admin@university.edu</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-auto py-3" onClick={() => navigate("/login")}>
                  <span className="text-sm font-medium">Student</span>
                  <span className="text-[10px] text-muted-foreground">alice@university.edu</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <p className="text-center text-xs text-muted-foreground">
          © 2026 Academic Stream LMS — Mock authentication with 2FA simulation.
        </p>
      </footer>
    </div>
  );
}
