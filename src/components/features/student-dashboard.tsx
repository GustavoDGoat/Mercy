"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, BookCopy, Clock, AlertTriangle, Loader2, Monitor, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { requestBorrow, getStudentRequests, getMemberLoans } from "@/app/dashboard/circulation/actions"
import { getBooks } from "@/app/dashboard/books/actions"

interface PageData {
  user: { firstName: string; lastName: string; memberId?: string }
  stats: { label: string; value: string | number; icon: React.ReactNode; color: string }[]
  books: Awaited<ReturnType<typeof getBooks>>
  transactions: Awaited<ReturnType<typeof getMemberLoans>>
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  returned: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-gray-100 text-gray-800",
}

const requestStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export function StudentDashboard({ user, stats, books, transactions: initialTx }: PageData) {
  const router = useRouter()
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<(typeof books)[number] | null>(null)
  const [duration, setDuration] = useState("14")
  const [format, setFormat] = useState<"digital" | "physical">("digital")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof getStudentRequests>>>([])
  const [transactions, setTransactions] = useState(initialTx)

  async function loadRequests() {
    const data = await getStudentRequests()
    setRequests(data)
  }

  useEffect(() => {
    loadRequests()
  }, [])

  function openBorrow(book: (typeof books)[number]) {
    setSelectedBook(book)
    setDuration("14")
    setFormat(book.pdfUrl ? "digital" : "physical")
    setError("")
    setBorrowDialogOpen(true)
  }

  async function handleRequestBorrow() {
    if (!selectedBook) return
    setSaving(true)
    setError("")
    try {
      const result = await requestBorrow({
        bookId: selectedBook.id,
        durationDays: parseInt(duration),
        format,
      })
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setBorrowDialogOpen(false)
      loadRequests()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit request")
    } finally {
      setSaving(false)
    }
  }

  function hasPendingRequest(bookId: string) {
    return requests.some((r) => r.bookId === bookId && r.status === "pending")
  }

  function getApprovedRequest(bookId: string) {
    const activeLoan = transactions.find((t) => t.bookId === bookId && t.status === "active")
    if (activeLoan) return { daysLeft: Math.max(0, Math.ceil((new Date(activeLoan.dueDate as string).getTime() - Date.now()) / 86400000)) }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {user.firstName}! Here&apos;s your library overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <span className={stat.color}>{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="loans">
        <TabsList>
          <TabsTrigger value="loans"><BookCopy className="w-4 h-4" />My Books</TabsTrigger>
          <TabsTrigger value="catalog"><BookOpen className="w-4 h-4" />Browse Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="mt-4 space-y-4">
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 dark:text-amber-400">
                  Pending Requests ({requests.filter((r) => r.status === "pending").length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.filter((r) => r.status === "pending").map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.bookTitle}</TableCell>
                        <TableCell>{r.durationDays} days</TableCell>
                        <TableCell className="capitalize">{r.format}</TableCell>
                        <TableCell>
                          <Badge className={requestStatusColors[r.status]}>{r.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BookCopy className="w-12 h-12 mb-4 opacity-40" />
                <p className="text-lg font-medium">No books borrowed yet</p>
                <p className="text-sm">Browse the catalog to request a book.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fine</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const book = books.find((b) => b.id === tx.bookId)
                    const isOverdue = tx.status !== "returned" && new Date(tx.dueDate) < new Date()
                    const daysLeft = tx.status === "active"
                      ? Math.max(0, Math.ceil((new Date(tx.dueDate).getTime() - Date.now()) / 86400000))
                      : 0

                    return (
                      <TableRow key={tx.id} className={isOverdue ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{book?.title || "Unknown"}</TableCell>
                        <TableCell className="text-sm">{new Date(tx.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">
                          <span className={isOverdue ? "text-destructive font-medium" : ""}>
                            {new Date(tx.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.status === "active" ? (
                            <span className={daysLeft <= 3 ? "text-destructive font-medium" : ""}>
                              {daysLeft} days
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[tx.status] || ""}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tx.fineAmount > 0 ? (
                            <span className={tx.finePaid ? "text-green-600" : "text-destructive font-medium"}>
                              ₦{tx.fineAmount.toFixed(2)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {book?.pdfUrl && tx.status === "active" && (
                            <Button variant="outline" size="sm" onClick={() => router.push(`/books/read/${tx.id}`)}>
                              <BookOpen className="w-4 h-4" />Continue Reading
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {books.filter((b) => b.availableCopies > 0).length} books available out of {books.length} total.
          </p>
          <ScrollArea className="h-[60vh]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.map((book) => {
                    const activeLoanTx = transactions.find((t) => t.bookId === book.id && t.status === "active")
                    const activeLoan = activeLoanTx != null
                    const pending = hasPendingRequest(book.id)
                    const approvedInfo = getApprovedRequest(book.id)

                    return (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{book.title}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{book.author}</TableCell>
                        <TableCell className="text-sm">{book.category}</TableCell>
                        <TableCell>
                          {book.pdfUrl ? (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Digital + Physical
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Physical Only</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {activeLoan ? (
                            <Badge className="bg-green-100 text-green-800">
                              Borrowed ({approvedInfo?.daysLeft}d left)
                            </Badge>
                          ) : pending ? (
                            <Badge className="bg-amber-100 text-amber-800">Request Pending</Badge>
                          ) : book.availableCopies > 0 ? (
                            <Badge className="bg-green-100 text-green-800">{book.availableCopies} available</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">Unavailable</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {activeLoanTx && book.pdfUrl ? (
                            <Button variant="outline" size="sm" onClick={() => router.push(`/books/read/${activeLoanTx.id}`)}>
                              <BookOpen className="w-4 h-4" />Continue Reading
                            </Button>
                          ) : !activeLoan && !pending && book.availableCopies > 0 ? (
                            <Button size="sm" onClick={() => openBorrow(book)}>
                              <BookCopy className="w-4 h-4" />Borrow
                            </Button>
                          ) : pending ? (
                            <span className="text-xs text-muted-foreground">Awaiting approval</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unavailable</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={borrowDialogOpen} onOpenChange={setBorrowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Borrow</DialogTitle>
            <DialogDescription>
              &quot;{selectedBook?.title}&quot; — {selectedBook?.availableCopies} copies available
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Borrow Duration</Label>
              <Select value={duration} onValueChange={(v) => setDuration(v ?? "14")}>
                <SelectTrigger>
                  <CalendarDays className="w-4 h-4" />
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="21">21 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat("digital")}
                  disabled={!selectedBook?.pdfUrl}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    format === "digital"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  } ${!selectedBook?.pdfUrl ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm font-medium">Digital</span>
                  <span className="text-[10px] text-muted-foreground">Read online</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("physical")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    format === "physical"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <BookOpen className="w-6 h-6" />
                  <span className="text-sm font-medium">Physical</span>
                  <span className="text-[10px] text-muted-foreground">Collect at library</span>
                </button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="font-medium">Due date:</span> {new Date(Date.now() + parseInt(duration) * 86400000).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">An admin or librarian will review your request.</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrowDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestBorrow} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
