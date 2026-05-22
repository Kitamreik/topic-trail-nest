import React, { createContext, useContext, useState, useEffect } from "react";
import { logActivity } from "@/lib/activityLog";

export type UserRole = "admin" | "student" | "webmaster";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type StoredUser = MockUser & { password: string };

interface AuthContextType {
  user: MockUser | null;
  isAdmin: boolean;
  isStudent: boolean;
  isWebmaster: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, password: string, role: UserRole) => { success: boolean; error?: string };
  logout: () => void;
  getAllUsers: () => StoredUser[];
  updateUser: (id: string, data: Partial<StoredUser>) => { success: boolean; error?: string };
  deleteUser: (id: string) => { success: boolean; error?: string };
  createUser: (data: Omit<StoredUser, "id" | "createdAt">) => { success: boolean; error?: string };
}

const AUTH_KEY = "academic-stream-auth";
const USERS_KEY = "academic-stream-users";

const now = new Date().toISOString();

const defaultUsers: StoredUser[] = [
  { id: "wm-1", name: "Webmaster", email: "webmaster@university.edu", role: "webmaster", password: "webmaster123", createdAt: "2024-01-01T00:00:00.000Z" },
  { id: "admin-1", name: "Prof. Anderson", email: "admin@university.edu", role: "admin", password: "admin123", createdAt: "2024-01-15T00:00:00.000Z" },
  { id: "s1", name: "Alice Johnson", email: "alice@university.edu", role: "student", password: "student123", createdAt: "2024-08-20T10:30:00.000Z" },
  { id: "s2", name: "Bob Smith", email: "bob@university.edu", role: "student", password: "student123", createdAt: "2024-08-21T14:15:00.000Z" },
  { id: "s3", name: "Carol Davis", email: "carol@university.edu", role: "student", password: "student123", createdAt: "2024-08-22T09:00:00.000Z" },
  { id: "s4", name: "David Lee", email: "david@university.edu", role: "student", password: "student123", createdAt: "2024-08-25T11:45:00.000Z" },
  { id: "s5", name: "Emma Wilson", email: "emma@university.edu", role: "student", password: "student123", createdAt: "2024-09-01T08:00:00.000Z" },
];

function loadUsers(): StoredUser[] {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (saved) {
      const users = JSON.parse(saved) as StoredUser[];
      // Ensure createdAt exists on legacy entries
      return users.map(u => ({ ...u, createdAt: u.createdAt || now }));
    }
  } catch {}
  localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_KEY);
  }, [user]);

  const login = (email: string, password: string) => {
    const users = loadUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { success: false, error: "Invalid email or password" };
    const { password: _, ...userData } = found;
    setUser(userData);
    logActivity({ action: "login", actor: found.name, actorRole: found.role, details: `Logged in as ${found.role}` });
    return { success: true };
  };

  const signup = (name: string, email: string, password: string, role: UserRole) => {
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: "An account with this email already exists" };
    }
    const newUser: StoredUser = { id: crypto.randomUUID(), name, email, role, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    const { password: _, ...userData } = newUser;
    setUser(userData);
    return { success: true };
  };

  const logout = () => {
    if (user) logActivity({ action: "logout", actor: user.name, actorRole: user.role, details: "Logged out" });
    setUser(null);
  };

  const getAllUsers = () => loadUsers();

  const updateUser = (id: string, data: Partial<StoredUser>) => {
    const users = loadUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: "User not found" };
    if (data.email && users.some((u, i) => i !== idx && u.email.toLowerCase() === data.email!.toLowerCase())) {
      return { success: false, error: "Email already in use" };
    }
    users[idx] = { ...users[idx], ...data };
    saveUsers(users);
    // Update current session if editing self
    if (user?.id === id) {
      const { password: _, ...userData } = users[idx];
      setUser(userData);
    }
    logActivity({ action: "user_edit", actor: user?.name || "System", actorRole: user?.role || "unknown", target: users[idx].name, details: `Edited user ${users[idx].email}` });
    return { success: true };
  };

  const deleteUser = (id: string) => {
    if (user?.id === id) return { success: false, error: "Cannot delete your own account" };
    const users = loadUsers();
    const target = users.find(u => u.id === id);
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return { success: false, error: "User not found" };
    saveUsers(filtered);
    logActivity({ action: "user_delete", actor: user?.name || "System", actorRole: user?.role || "unknown", target: target?.name, details: `Deleted ${target?.email}` });
    return { success: true };
  };

  const createUser = (data: Omit<StoredUser, "id" | "createdAt">) => {
    const users = loadUsers();
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: "Email already in use" };
    }
    const newUser: StoredUser = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    logActivity({ action: "user_create", actor: user?.name || "System", actorRole: user?.role || "unknown", target: newUser.name, details: `Created account ${newUser.email} (${newUser.role})` });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.role === "admin",
      isStudent: user?.role === "student",
      isWebmaster: user?.role === "webmaster",
      login, signup, logout,
      getAllUsers, updateUser, deleteUser, createUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
