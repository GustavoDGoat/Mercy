"use client"

import { useEffect, useState } from "react"
import {
  Search,
  BookCopy,
  ArrowLeftRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  User,
  BookOpen,
  Calendar,
  Bell,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTransactions, issueBook, returnBook, payFine, checkOverdueBooks, getPendingRequests, approveRequest, rejectRequest } from "@/app/dashboard/circulation/actions"
import { getMembers } from "@/app/dashboard/members/actions"
import { getBooks } from "@/app/dashboard/books/actions"
import type { Book, Member } from "@/types"
import { format, differenceInCalendarDays } from "date-fns"

interface EnhancedTransaction {
  id: string
  bookId: string
  memberId: string
  issuedBy: string
  issueDate: string
  dueDate: string
  returnDate?: string
  fineAmount: number
  finePaid: boolean
  status: string
  createdAt: string
  updatedAt: string
  bookTitle: string
  bookAuthor: string
  memberName: string
  memberMatric: string
  daysOverdue: number
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  returned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

export function CirculationPage() {
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<EnhancedTransaction | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedBook, setSelectedBook] = useState("")
  const [selectedMember, setSelectedMember] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [overdueAlerts, setOverdueAlerts] = useState<
    { transactionId: string; bookTitle: string; memberName: string; daysOverdue: number; fineAmount: number }[]
  >([])
  const [requests, setRequests] = useState<
    (Awaited<ReturnType<typeof getPendingRequests>>)[number][]
  >([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<
    (typeof requests)[number] | null
  >(null)
  const [approveDuration, setApproveDuration] = useState("14")

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const txData = await getTransactions(search || undefined, statusFilter !== "all" ? statusFilter : undefined)
      setTransactions(txData)
    } catch {
      setError("Failed to load transactions")
    }

    try {
      const bookData = await getBooks()
      setBooks(bookData)
    } catch {
      setError("Failed to load books")
    }

    try {
      const memberData = await getMembers()
      setMembers(memberData)
    } catch {
      setError("Failed to load members")
    }

    try {
      const requestData = await getPendingRequests()
      setRequests(requestData)
    } catch {
      setError("Failed to load borrow requests")
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => loadData(), 300)
    return () => clearTimeout(debounce)
  }, [search, statusFilter])

  async function handleIssue() {
    if (!selectedBook || !selectedMember) return
    setSaving(true)
    setError("")
    try {
      const result = await issueBook({ bookId: selectedBook, memberId: selectedMember })
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setIssueDialogOpen(false)
      setSelectedBook("")
      setSelectedMember("")
      loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to issue book")
    } finally {
      setSaving(false)
    }
  }

  async function handleReturn() {
    if (!selectedTransaction) return
    setSaving(true)
    setError("")
    try {
      const result = await returnBook(selectedTransaction.id)
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setReturnDialogOpen(false)
      setSelectedTransaction(null)
      loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to return book")
    } finally {
      setSaving(false)
    }
  }

  async function handlePayFine() {
    if (!selectedTransaction) return
    setSaving(true)
    try {
      await payFine(selectedTransaction.id)
      setReturnDialogOpen(false)
      setSelectedTransaction(null)
      loadData()
    } catch {
      setError("Failed to pay fine")
    } finally {
      setSaving(false)
    }
  }

  async function handleCheckOverdue() {
    setSaving(true)
    setError("")
    try {
      const alerts = await checkOverdueBooks()
      setOverdueAlerts(alerts)
      loadData()
    } catch {
      setError("Failed to check overdue books")
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove(req: (typeof requests)[number]) {
    setSaving(true)
    setError("")
    try {
      const result = await approveRequest(req.id as string, parseInt(approveDuration) || (req.durationDays as number))
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      loadData()
    } catch {
      setError("Failed to approve request")
    } finally {
      setSaving(false)
    }
  }

  async function handleReject() {
    if (!selectedRequest || !rejectReason) return
    setSaving(true)
    setError("")
    try {
      await rejectRequest(selectedRequest.id as string, rejectReason)
      setRejectDialogOpen(false)
      setSelectedRequest(null)
      setRejectReason("")
      loadData()
    } catch {
      setError("Failed to reject request")
    } finally {
      setSaving(false)
    }
  }

  const availableBooks = books.filter((b) => b.availableCopies > 0)
  const activeMembers = members.filter((m) => m.status === "active")

  const activeLoans = transactions.filter((t) => t.status === "active")
  const overdueCount = activeLoans.filter(
    (t) => new Date(t.dueDate) < new Date()
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Circulation Desk</h1>
          <p className="text-muted-foreground">
            {activeLoans.length} active loans{dueCountText(overdueCount)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCheckOverdue} disabled={saving}>
            <AlertTriangle className="w-4 h-4" />
            Check Overdue
          </Button>
          <Button onClick={() => {
            setIssueDialogOpen(true)
            setError("")
            setSelectedBook("")
            setSelectedMember("")
          }}>
            <BookCopy className="w-4 h-4" />
            Issue Book
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => { setError(""); loadData() }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {overdueAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {overdueAlerts.length} overdue book{overdueAlerts.length > 1 ? "s" : ""} detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueAlerts.map((alert) => (
                <div key={alert.transactionId} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{alert.bookTitle}</span>
                    <span className="text-muted-foreground"> — {alert.memberName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-destructive font-medium">{alert.daysOverdue} days</span>
                    <span className="text-destructive font-medium">₦{alert.fineAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">
            <BookCopy className="w-4 h-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Bell className="w-4 h-4" />
            Requests {requests.length > 0 && `(${requests.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by book title, member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="due_soon">Due Soon (3 days)</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookCopy className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No transactions found</p>
          <p className="text-sm">Issue a book to get started.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const isOverdue = tx.status === "active" && new Date(tx.dueDate) < new Date()
                const daysLeft = differenceInCalendarDays(new Date(tx.dueDate), new Date())

                return (
                  <TableRow key={tx.id} className={isOverdue ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {tx.bookTitle}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{tx.memberName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tx.memberMatric}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(tx.issueDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                        {format(new Date(tx.dueDate), "MMM d, yyyy")}
                      </span>
                      {tx.status === "active" && (
                        <span className="block text-xs text-muted-foreground">
                          {daysLeft > 0
                            ? `${daysLeft} days left`
                            : `${Math.abs(daysLeft)} days overdue`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.returnDate
                        ? format(new Date(tx.returnDate), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[tx.status] || ""}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.fineAmount > 0 ? (
                        <span className={`font-medium ${tx.finePaid ? "text-green-600" : "text-destructive"}`}>
                          ₦{tx.fineAmount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {tx.status === "active" || tx.status === "overdue" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(tx)
                            setReturnDialogOpen(true)
                            setError("")
                          }}
                        >
                          Return
                        </Button>
                      ) : tx.fineAmount > 0 && !tx.finePaid ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(tx)
                            setReturnDialogOpen(true)
                            setError("")
                          }}
                        >
                          Pay Fine
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Completed</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
            <DialogDescription>Select a member and an available book to issue.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={selectedMember} onValueChange={(v) => setSelectedMember(v ?? "")}>
                <SelectTrigger>
                  <User className="w-4 h-4" />
                  <SelectValue placeholder="Select a member..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-60">
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.matricNumber})
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Book</Label>
              <Select value={selectedBook} onValueChange={(v) => setSelectedBook(v ?? "")}>
                <SelectTrigger>
                  <BookOpen className="w-4 h-4" />
                  <SelectValue placeholder="Select a book..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-60">
                    {availableBooks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.title} ({b.availableCopies} available)
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {selectedMember && selectedBook && (() => {
              const book = books.find((b) => b.id === selectedBook)
              const member = members.find((m) => m.id === selectedMember)
              if (!book || !member) return null
              const loanCount = transactions.filter(
                (t) => t.memberId === member.id && t.status === "active"
              ).length
              return (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p><span className="font-medium">Due date:</span> {format(new Date(Date.now() + 14 * 86400000), "MMMM d, yyyy")}</p>
                  <p><span className="font-medium">Loan period:</span> 14 days</p>
                  <p className={loanCount >= member.maxBorrowLimit ? "text-destructive" : "text-muted-foreground"}>
                    <span className="font-medium">Current loans:</span> {loanCount} / {member.maxBorrowLimit}
                  </p>
                </div>
              )
            })()}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={saving || !selectedBook || !selectedMember}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTransaction?.fineAmount && !selectedTransaction.finePaid
                ? "Pay Fine"
                : "Return Book"}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.fineAmount && !selectedTransaction.finePaid
                ? "Pay the outstanding fine for this overdue return."
                : "Confirm the return of this book."}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Book</p>
                  <p className="font-medium">{selectedTransaction.bookTitle}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member</p>
                  <p className="font-medium">{selectedTransaction.memberName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Issued</p>
                  <p>{format(new Date(selectedTransaction.issueDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className={new Date(selectedTransaction.dueDate) < new Date() ? "text-destructive font-medium" : ""}>
                    {format(new Date(selectedTransaction.dueDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {selectedTransaction.fineAmount > 0 && (
                <div className="bg-destructive/10 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Outstanding Fine</p>
                    <p className="text-sm text-destructive/70">
                      {differenceInCalendarDays(new Date(), new Date(selectedTransaction.dueDate))} days overdue
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-destructive">
                    ₦{selectedTransaction.fineAmount.toFixed(2)}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturnDialogOpen(false); setSelectedTransaction(null) }}>
              Cancel
            </Button>
            {selectedTransaction?.fineAmount && !selectedTransaction.finePaid ? (
              <Button onClick={handlePayFine} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay Fine"}
              </Button>
            ) : (
              <Button onClick={handleReturn} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Return"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-4">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No pending requests</p>
              <p className="text-sm">Student borrow requests will appear here.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id as string}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{req.memberName as string}</p>
                          <p className="text-xs text-muted-foreground font-mono">{req.memberMatric as string}</p>
                          <p className="text-xs text-muted-foreground">{req.studentEmail as string}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {req.bookTitle as string}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select value={approveDuration} onValueChange={(v) => setApproveDuration(v ?? "14")}>
                            <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 days</SelectItem>
                              <SelectItem value="14">14 days</SelectItem>
                              <SelectItem value="21">21 days</SelectItem>
                              <SelectItem value="30">30 days</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-xs text-muted-foreground">(req: {req.durationDays as number}d)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={req.format === "digital" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                          {req.format as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(req.createdAt as string), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="default" size="sm" onClick={() => handleApprove(req)} disabled={saving}>
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(req)
                              setRejectReason("")
                              setRejectDialogOpen(true)
                            }}
                            disabled={saving}
                            className="text-destructive"
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Borrow Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedRequest?.memberName as string}&apos;s request for &quot;{selectedRequest?.bookTitle as string}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejectReason">Reason *</Label>
            <Input
              id="rejectReason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Book is reserved for reference only"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={saving || !rejectReason}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function dueCountText(count: number) {
  return count > 0 ? ` (${count} overdue)` : ""
}
