import { useState } from "react";
import { useAuth, type StoredUser, type UserRole } from "@/context/AuthContext";
import { getActivityLog, logActivity, type ActivityEntry } from "@/lib/activityLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Pencil, Trash2, Mail, Search, Eye, EyeOff,
  Shield, ShieldCheck, GraduationCap, UserCog, Clock, Activity,
  Plus, LogIn, LogOut, UserPlus, RefreshCw, Cloud,
} from "lucide-react";
import GoogleClassroomImport from "@/components/GoogleClassroomImport";

function RoleIcon({ role }: { role: UserRole }) {
  switch (role) {
    case "webmaster": return <ShieldCheck className="h-4 w-4 text-primary" />;
    case "admin": return <Shield className="h-4 w-4 text-amber-500" />;
    default: return <GraduationCap className="h-4 w-4 text-emerald-500" />;
  }
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const actionIcons: Record<string, any> = {
  login: LogIn,
  logout: LogOut,
  user_edit: Pencil,
  user_delete: Trash2,
  user_create: UserPlus,
  password_reset: Mail,
};

const actionColors: Record<string, string> = {
  login: "text-emerald-600",
  logout: "text-muted-foreground",
  user_edit: "text-amber-600",
  user_delete: "text-destructive",
  user_create: "text-primary",
  password_reset: "text-violet-600",
};

function UserCard({
  user,
  isSelf,
  showPassword,
  onTogglePassword,
  onEdit,
  onDelete,
  onResetEmail,
}: {
  user: StoredUser;
  isSelf: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onResetEmail: () => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold uppercase">
              {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                {isSelf && <Badge variant="outline" className="text-[9px] shrink-0">You</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="capitalize text-[10px] gap-1 px-2">
                  <RoleIcon role={user.role} />
                  {user.role}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <code className="text-[11px] bg-muted px-2 py-0.5 rounded font-mono">
                  {showPassword ? user.password : "••••••••"}
                </code>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onTogglePassword}>
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResetEmail} title="Reset password">
              <Mail className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isSelf}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Webmaster() {
  const { getAllUsers, updateUser, deleteUser, createUser, user: currentUser } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>(() => getAllUsers());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [editUser, setEditUser] = useState<StoredUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "student" as UserRole });
  const [deleteConfirm, setDeleteConfirm] = useState<StoredUser | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() => getActivityLog());

  // Create user state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "student" as UserRole });

  const refresh = () => { setUsers(getAllUsers()); setActivityLog(getActivityLog()); };

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === "student").length,
    admins: users.filter(u => u.role === "admin").length,
    webmasters: users.filter(u => u.role === "webmaster").length,
  };

  const openEdit = (u: StoredUser) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, password: u.password, role: u.role });
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    const result = updateUser(editUser.id, { name: editForm.name.trim(), email: editForm.email.trim(), password: editForm.password, role: editForm.role });
    if (result.success) { toast.success("User updated"); refresh(); setEditUser(null); }
    else toast.error(result.error);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const result = deleteUser(deleteConfirm.id);
    if (result.success) { toast.success(`${deleteConfirm.name} deleted`); refresh(); setDeleteConfirm(null); }
    else toast.error(result.error);
  };

  const handleResetEmail = (u: StoredUser) => {
    logActivity({ action: "password_reset", actor: currentUser?.name || "Webmaster", actorRole: currentUser?.role || "webmaster", target: u.name, details: `Sent reset to ${u.email}` });
    setActivityLog(getActivityLog());
    toast.success(`Password reset email sent to ${u.email}`, { description: "Mock action — no email sent." });
  };

  const handleCreateUser = () => {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error("All fields are required"); return;
    }
    const result = createUser({ name: createForm.name.trim(), email: createForm.email.trim(), password: createForm.password, role: createForm.role });
    if (result.success) {
      toast.success(`Created ${createForm.name}`);
      refresh();
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "student" });
    } else toast.error(result.error);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*";
    const pw: string[] = [];
    for (let i = 0; i < 16; i++) pw.push(chars[Math.floor(Math.random() * chars.length)]);
    setCreateForm(f => ({ ...f, password: pw.join("") }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" /> User Management Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform accounts, roles, and credentials</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create User
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total} color="bg-primary" />
        <StatCard icon={GraduationCap} label="Students" value={stats.students} color="bg-emerald-500" />
        <StatCard icon={Shield} label="Admins" value={stats.admins} color="bg-amber-500" />
        <StatCard icon={ShieldCheck} label="Webmasters" value={stats.webmasters} color="bg-violet-500" />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity Log</TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5"><Cloud className="h-3.5 w-3.5" /> Import</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4 space-y-4">
          <GoogleClassroomImport />
        </TabsContent>


        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "student", "admin", "webmaster"] as const).map(r => (
                <Button key={r} variant={roleFilter === r ? "default" : "outline"} size="sm" className="text-xs capitalize" onClick={() => setRoleFilter(r)}>
                  {r === "all" ? "All" : r}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No users match your search</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(u => (
                <UserCard
                  key={u.id} user={u} isSelf={u.id === currentUser?.id}
                  showPassword={!!showPasswords[u.id]}
                  onTogglePassword={() => setShowPasswords(p => ({ ...p, [u.id]: !p[u.id] }))}
                  onEdit={() => openEdit(u)} onDelete={() => setDeleteConfirm(u)} onResetEmail={() => handleResetEmail(u)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActivityLog(getActivityLog())}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet</p>
              ) : (
                <div className="space-y-1">
                  {activityLog.map(entry => {
                    const Icon = actionIcons[entry.action] || Activity;
                    const color = actionColors[entry.action] || "text-muted-foreground";
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`mt-0.5 ${color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{entry.actor}</span>
                            {entry.target && <> → <span className="font-medium">{entry.target}</span></>}
                          </p>
                          {entry.details && <p className="text-xs text-muted-foreground">{entry.details}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Password</Label><Input value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin / Instructor</SelectItem>
                  <SelectItem value="webmaster">Webmaster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong> ({deleteConfirm?.email})? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Full Name</Label><Input placeholder="Jane Doe" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="jane@university.edu" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <button type="button" onClick={generatePassword} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <RefreshCw className="h-3 w-3" /> Generate
                </button>
              </div>
              <Input value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin / Instructor</SelectItem>
                  <SelectItem value="webmaster">Webmaster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser}><UserPlus className="h-4 w-4 mr-1" /> Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
