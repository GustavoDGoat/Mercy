"use client"

import { useEffect, useState, useRef } from "react"
import {
  Shield,
  Radio,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Search,
  Trash2,
  History,
  Clock,
  BookOpen,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { getRFIDStatus, simulateGateScan, getGateEvents, clearGateEvents } from "@/app/dashboard/rfid/actions"
import { format } from "date-fns"

interface RFIDBook {
  bookId: string
  title: string
  author: string
  tagId: string
  tagActive: boolean
  bookStatus: string
  isCheckedOut: boolean
  borrowedBy: string | null
  lastScanned: string | null
}

interface GateEvent {
  id: string
  bookId: string
  bookTitle: string
  tagId: string
  memberId?: string
  authorized: boolean
  triggeredAt: string
}

export function RFIDPage() {
  const [books, setBooks] = useState<RFIDBook[]>([])
  const [events, setEvents] = useState<GateEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [scanning, setScanning] = useState(false)
  const [alarm, setAlarm] = useState<{ bookTitle: string; tagId: string } | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [alertDialog, setAlertDialog] = useState(false)
  const alarmRef = useRef<HTMLDivElement>(null)

  async function loadData() {
    try {
      const [bookData, eventData] = await Promise.all([
        getRFIDStatus(),
        getGateEvents(),
      ])
      setBooks(bookData)
      setEvents(eventData)
    } catch {
      void 0
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (alarm && alarmRef.current) {
      alarmRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [alarm])

  async function handleScan(bookId: string) {
    setScanning(true)
    setAlarm(null)
    try {
      const result = await simulateGateScan(bookId)
      if (result && "alarm" in result) {
        if (result.alarm) {
          const book = books.find((b) => b.bookId === bookId)
          setAlarm({
            bookTitle: book?.title || "Unknown",
            tagId: book?.tagId || "N/A",
          })
          setAlertDialog(true)
        }
      }
      loadData()
    } catch {
      void 0
    } finally {
      setScanning(false)
    }
  }

  async function handleClearEvents() {
    await clearGateEvents()
    loadData()
  }

  const filteredBooks = books.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.title.toLowerCase().includes(q) ||
      b.tagId.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    )
  })

  const unauthorizedScan = books.filter((b) => !b.isCheckedOut)
  const checkedOutScan = books.filter((b) => b.isCheckedOut)
  const alarmEvents = events.filter((e) => !e.authorized)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RFID Gate Monitor</h1>
          <p className="text-muted-foreground">
            Monitor exit gate RFID scans and prevent unauthorized book removal
          </p>
        </div>
        <Button variant="outline" onClick={handleClearEvents} size="sm">
          <Trash2 className="w-4 h-4" />
          Clear Events
        </Button>
      </div>

      {alarmEvents.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 animate-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {alarmEvents.length} unauthorized exit{alarmEvents.length > 1 ? "s" : ""} detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alarmEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{event.bookTitle}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="font-mono text-xs">{event.tagId}</span>
                    <span>{format(new Date(event.triggeredAt), "MMM d, HH:mm:ss")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tagged Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{books.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Checked Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{checkedOutScan.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Shelf (Risk)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{unauthorizedScan.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList>
          <TabsTrigger value="scan">
            <Radio className="w-4 h-4" />
            Gate Scanner
          </TabsTrigger>
          <TabsTrigger value="events">
            <History className="w-4 h-4" />
            Event Log ({events.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author or tag ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>RFID Tag</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Borrowed By</TableHead>
                    <TableHead>Last Scanned</TableHead>
                    <TableHead className="text-right">Scan Gate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBooks.map((book) => (
                    <TableRow
                      key={book.bookId}
                      className={!book.isCheckedOut ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {book.title}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded ${
                          book.tagActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          <Radio className="w-3 h-3" />
                          {book.tagId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            book.isCheckedOut
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }
                        >
                          {book.isCheckedOut ? "Checked Out" : "On Shelf"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {book.borrowedBy || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {book.lastScanned
                          ? format(new Date(book.lastScanned), "MMM d, HH:mm")
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={book.isCheckedOut ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleScan(book.bookId)}
                          disabled={scanning}
                        >
                          {scanning && selectedBookId === book.bookId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Radio className="w-4 h-4" />
                              Scan
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-lg font-medium">No scan events yet</p>
              <p className="text-sm">Click &quot;Scan&quot; on a book to simulate an exit gate pass.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>RFID Tag</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.triggeredAt), "MMM d, yyyy HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{event.bookTitle}</TableCell>
                      <TableCell className="font-mono text-xs">{event.tagId}</TableCell>
                      <TableCell>
                        {event.authorized ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Authorized
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertTriangle className="w-3 h-3" />
                            ALARM
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
        <DialogContent className="border-destructive/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Unauthorized Removal Detected
            </DialogTitle>
            <DialogDescription>
              A book has passed through the exit gate without authorization.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Book</span>
              <span className="font-medium">{alarm?.bookTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">RFID Tag</span>
              <span className="font-mono text-sm">{alarm?.tagId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-red-100 text-red-800">NOT CHECKED OUT</Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This incident has been logged in the audit trail. Please verify with the individual
            before they exit the library.
          </p>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setAlertDialog(false)}>
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
