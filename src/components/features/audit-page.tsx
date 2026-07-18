"use client"

import { useEffect, useState } from "react"
import {
  FileText,
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  LogIn,
  LogOut,
  BookOpen,
  Users,
  BookCopy,
  AlertTriangle,
  Filter,
} from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuditLog } from "@/lib/audit"
import type { AuditAction, AuditEntry } from "@/types"
import { format } from "date-fns"

const actionLabels: Record<AuditAction, { label: string; color: string }> = {
  login: { label: "Login", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  logout: { label: "Logout", color: "bg-gray-100 text-gray-800" },
  create_book: { label: "Book Created", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  update_book: { label: "Book Updated", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  delete_book: { label: "Book Deleted", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  register_member: { label: "Member Registered", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  update_member: { label: "Member Updated", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  delete_member: { label: "Member Deleted", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  issue_book: { label: "Book Issued", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  return_book: { label: "Book Returned", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  overdue_detected: { label: "Overdue Detected", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  fine_paid: { label: "Fine Paid", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rfid_alarm: { label: "RFID Alarm", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [integrity, setIntegrity] = useState<{ valid: boolean; tamperedIndex: number }>({ valid: true, tamperedIndex: -1 })

  async function loadData() {
    try {
      const { verifyAuditIntegrity } = await import("@/lib/audit")
      const log = getAuditLog(200)
      setEntries(log)
      setIntegrity(verifyAuditIntegrity())
    } catch {
      void 0
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = entries.filter((entry) => {
    const matchAction = actionFilter === "all" || entry.action === actionFilter
    const matchSearch =
      !search ||
      entry.details.toLowerCase().includes(search.toLowerCase()) ||
      entry.action.toLowerCase().includes(search.toLowerCase())
    return matchAction && matchSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">
            Tamper-resistant activity log with hash chain integrity verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          {integrity.valid ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <ShieldCheck className="w-3 h-3" />
              Chain Valid
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <ShieldAlert className="w-3 h-3" />
              Tampered at #{integrity.tamperedIndex}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search audit entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4" />
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(actionLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No audit entries found</p>
              <p className="text-sm">Activity will appear here as the system is used.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[120px]">Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry, i) => (
                  <TableRow
                    key={entry.id}
                    className={
                      integrity.tamperedIndex === i
                        ? "bg-destructive/10"
                        : ""
                    }
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm:ss")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionLabels[entry.action]?.color || ""}>
                        {actionLabels[entry.action]?.label || entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[400px] truncate">
                      {entry.details}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">
                      {entry.hash.slice(0, 12)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
