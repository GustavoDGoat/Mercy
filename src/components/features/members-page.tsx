"use client"

import { useEffect, useState } from "react"
import { Search, Plus, Pencil, Trash2, Users, Loader2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Member } from "@/types"
import { getMembers, createMember, updateMember, deleteMember } from "@/app/dashboard/members/actions"

interface MemberFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  matricNumber: string
  department: string
  faculty: string
  level: string
}

const emptyForm: MemberFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  matricNumber: "",
  department: "",
  faculty: "",
  level: "100L",
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  suspended: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

const levels = ["100L", "200L", "300L", "400L", "500L", "PGD", "M.Sc", "Ph.D"]

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [form, setForm] = useState<MemberFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadMembers() {
    try {
      const data = await getMembers(search || undefined, statusFilter !== "all" ? statusFilter : undefined)
      setMembers(data)
    } catch {
      setError("Failed to load members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => loadMembers(), 300)
    return () => clearTimeout(debounce)
  }, [search, statusFilter])

  function openCreate() {
    setEditingMember(null)
    setForm(emptyForm)
    setError("")
    setDialogOpen(true)
  }

  function openEdit(member: Member) {
    setEditingMember(member)
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      matricNumber: member.matricNumber,
      department: member.department,
      faculty: member.faculty,
      level: member.level,
    })
    setError("")
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      if (editingMember) {
        await updateMember(editingMember.id, { ...form })
      } else {
        const result = await createMember(form)
        if (result && "error" in result) setError(result.error as string)
      }
      setDialogOpen(false)
      loadMembers()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save member")
    } finally {
      setSaving(false)
    }
  }

  async function handleSuspendToggle(member: Member) {
    try {
      await updateMember(member.id, {
        status: member.status === "active" ? "suspended" : "active",
      })
      loadMembers()
    } catch {
      setError("Failed to update member status")
    }
  }

  async function handleDelete() {
    if (!editingMember) return
    setSaving(true)
    try {
      const result = await deleteMember(editingMember.id)
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setDeleteDialogOpen(false)
      setEditingMember(null)
      loadMembers()
    } catch {
      setError("Failed to delete member")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Member Management</h1>
          <p className="text-muted-foreground">{members.length} registered members</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, matric number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <Filter className="w-4 h-4" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No members found</p>
          <p className="text-sm">Try adjusting your search or register a new member.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Matric No.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{member.matricNumber}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{member.department}</TableCell>
                  <TableCell>{member.level}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[member.status] || ""}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleSuspendToggle(member)}>
                        {member.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(member)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingMember(member)
                          setDeleteDialogOpen(true)
                          setError("")
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Register New Member"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update member information." : "Enter the student or staff details."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matricNumber">Matric Number *</Label>
                  <Input
                    id="matricNumber"
                    value={form.matricNumber}
                    onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v ?? "100L" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faculty">Faculty</Label>
                  <Input
                    id="faculty"
                    value={form.faculty}
                    onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">
                  {error}
                </p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.firstName || !form.lastName || !form.email || !form.matricNumber}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMember ? "Save Changes" : "Register Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {editingMember?.firstName} {editingMember?.lastName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
