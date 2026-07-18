"use client"

import { useEffect, useState } from "react"
import { Loader2, Users, Trash2, Shield, BookOpen, UserCog, Plus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getUsers, deleteUser, createStudentAccount, createLibrarianAccount } from "@/app/dashboard/users/actions"
import { format } from "date-fns"

interface UserView { id: string; email: string; firstName: string; lastName: string; role: string; memberId?: string; memberName: string | null; createdAt: string; updatedAt: string }

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  librarian: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  student: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />, librarian: <BookOpen className="w-4 h-4" />, student: <Users className="w-4 h-4" />,
}

interface AccountForm {
  email: string; password: string; firstName: string; lastName: string
  phone: string; matricNumber: string; department: string; faculty: string; level: string
}

const emptyAccountForm: AccountForm = {
  email: "", password: "", firstName: "", lastName: "",
  phone: "", matricNumber: "", department: "", faculty: "", level: "100L",
}

export function UsersPage() {
  const [users, setUsers] = useState<UserView[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createRole, setCreateRole] = useState<"student" | "librarian">("student")
  const [selectedUser, setSelectedUser] = useState<UserView | null>(null)
  const [form, setForm] = useState<AccountForm>(emptyAccountForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadData() {
    try { setUsers(await getUsers()) } catch { setError("Failed to load users") } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function handleDelete() {
    if (!selectedUser) return
    setSaving(true); setError("")
    try {
      const result = await deleteUser(selectedUser.id)
      if (result && "error" in result) { setError(result.error as string); return }
      setDeleteDialogOpen(false); setSelectedUser(null); loadData()
    } catch { setError("Failed to delete user") } finally { setSaving(false) }
  }

  async function handleCreateAccount() {
    setSaving(true); setError("")
    try {
      const action = createRole === "student" ? createStudentAccount : createLibrarianAccount
      const result = await action(form)
      if (result && "error" in result) { setError(result.error as string); return }
      setCreateDialogOpen(false); setForm(emptyAccountForm); loadData()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to create account") } finally { setSaving(false) }
  }

  function openCreate(role: "student" | "librarian") {
    setCreateRole(role); setForm(emptyAccountForm); setError(""); setCreateDialogOpen(true)
  }

  const counts = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    librarians: users.filter((u) => u.role === "librarian").length,
    students: users.filter((u) => u.role === "student").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system users, roles, and access</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => openCreate("librarian")}>
            <UserPlus className="w-4 h-4" />Add Librarian
          </Button>
          <Button onClick={() => openCreate("student")}>
            <Plus className="w-4 h-4" />Add Student
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { l: "Total Users", v: counts.total, c: "" },
          { l: "Admins", v: counts.admins, c: "text-red-600" },
          { l: "Librarians", v: counts.librarians, c: "text-blue-600" },
          { l: "Students", v: counts.students, c: "text-green-600" },
        ].map((s) => (
          <Card key={s.l}><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{s.l}</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p></CardContent></Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Linked Member</TableHead><TableHead>Registered</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell><Badge className={roleColors[user.role] || ""}>{roleIcons[user.role]}{user.role}</Badge></TableCell>
                  <TableCell className="text-sm">{user.memberName || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setError(""); setDeleteDialogOpen(true) }} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete User</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader>
          {error && <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete User"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add {createRole === "student" ? "Student" : "Librarian"} Account</DialogTitle>
            <DialogDescription>Create a new {createRole} account. They will be able to log in with these credentials.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
                <div className="space-y-2 col-span-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                <div className="space-y-2 col-span-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Min. 6 characters" /></div>
                <div className="space-y-2"><Label>Matric Number *</Label><Input value={form.matricNumber} onChange={(e) => setForm({ ...form, matricNumber: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Level</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v ?? "100L" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {createRole === "student"
                        ? ["100L", "200L", "300L", "400L", "500L", "PGD", "M.Sc", "Ph.D"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)
                        : ["STAFF"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
                <div className="space-y-2"><Label>Faculty</Label><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} /></div>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAccount} disabled={saving || !form.email || !form.password || !form.firstName || !form.lastName || !form.matricNumber}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create ${createRole === "student" ? "Student" : "Librarian"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
