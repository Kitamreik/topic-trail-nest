import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LMSProvider } from "@/context/LMSContext";
import { ChatProvider } from "@/context/ChatContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SemesterProvider } from "@/context/SemesterContext";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import Announcements from "./pages/Announcements";
import Discussions from "./pages/Discussions";
import Grades from "./pages/Grades";
import Admin from "./pages/Admin";
import Submissions from "./pages/Submissions";
import NotificationPreferences from "./pages/NotificationPreferences";
import Profile from "./pages/Profile";
import CalendarView from "./pages/CalendarView";
import Webmaster from "./pages/Webmaster";
import FileVault from "./pages/FileVault";
import Exams from "./pages/Exams";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function WebmasterRoute({ children }: { children: React.ReactNode }) {
  const { user, isWebmaster } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (!isWebmaster) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <SemesterProvider>
      <LMSProvider>
        <ChatProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
          <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout><Dashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/topics" element={
            <ProtectedRoute>
              <AppLayout><Topics /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/announcements" element={
            <ProtectedRoute>
              <AppLayout><Announcements /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/discussions" element={
            <ProtectedRoute>
              <AppLayout><Discussions /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/grades" element={
            <ProtectedRoute>
              <AppLayout><Grades /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <AppLayout><CalendarView /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/vault" element={
            <ProtectedRoute>
              <AppLayout><FileVault /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/exams" element={
            <ProtectedRoute>
              <AppLayout><Exams /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <AppLayout><Chat /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <AppLayout><NotificationPreferences /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <AppLayout><Profile /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <AppLayout><Admin /></AppLayout>
            </AdminRoute>
          } />
          <Route path="/submissions" element={
            <AdminRoute>
              <AppLayout><Submissions /></AppLayout>
            </AdminRoute>
          } />
          <Route path="/webmaster" element={
            <WebmasterRoute>
              <AppLayout><Webmaster /></AppLayout>
            </WebmasterRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ChatProvider>
      </LMSProvider>
    </SemesterProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
