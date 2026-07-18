"use client"

import { useEffect, useState } from "react"
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  QrCode,
  Loader2,
  Filter,
  Eye,
  FileText,
  Image,
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
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Book } from "@/types"
import { getBooks, createBook, updateBook, deleteBook, getCategories } from "@/app/dashboard/books/actions"

interface BookFormData {
  isbn: string
  title: string
  author: string
  publisher: string
  yearPublished: number
  edition: string
  category: string
  shelfLocation: string
  totalCopies: number
  pdfUrl: string
  coverImage: string
  description: string
}

const emptyForm: BookFormData = {
  isbn: "",
  title: "",
  author: "",
  publisher: "",
  yearPublished: new Date().getFullYear(),
  edition: "1st Edition",
  category: "",
  shelfLocation: "",
  totalCopies: 3,
  pdfUrl: "",
  coverImage: "",
  description: "",
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  borrowed: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

const categories = [
  "Computer Science",
  "Medicine",
  "Finance",
  "Software Engineering",
  "Web Development",
  "Database",
  "Computer Engineering",
  "Mathematics",
  "Physics",
  "Electrical Engineering",
  "Mechanical Engineering",
  "General Studies",
]

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [readDialogOpen, setReadDialogOpen] = useState(false)
  const [readingBook, setReadingBook] = useState<Book | null>(null)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [form, setForm] = useState<BookFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("details")

  async function loadBooks() {
    try {
      const data = await getBooks(
        search || undefined,
        categoryFilter !== "all" ? categoryFilter : undefined
      )
      setBooks(data)
    } catch {
      setError("Failed to load books")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      loadBooks()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search, categoryFilter])

  function openCreate() {
    setEditingBook(null)
    setForm(emptyForm)
    setError("")
    setActiveTab("details")
    setDialogOpen(true)
  }

  function openEdit(book: Book) {
    setEditingBook(book)
    setForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      yearPublished: book.yearPublished,
      edition: book.edition,
      category: book.category,
      shelfLocation: book.shelfLocation,
      totalCopies: book.totalCopies,
      pdfUrl: book.pdfUrl || "",
      coverImage: book.coverImage || "",
      description: book.description || "",
    })
    setError("")
    setActiveTab("details")
    setDialogOpen(true)
  }

  function openRead(book: Book) {
    setReadingBook(book)
    setReadDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      if (editingBook) {
        const result = await updateBook(editingBook.id, {
          ...form,
          pdfUrl: form.pdfUrl || null,
          coverImage: form.coverImage || null,
          description: form.description || null,
        })
        if (result && "error" in result) setError(result.error as string)
      } else {
        const result = await createBook(form)
        if (result && "error" in result) setError(result.error as string)
      }
      setDialogOpen(false)
      loadBooks()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save book")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editingBook) return
    setSaving(true)
    try {
      const result = await deleteBook(editingBook.id)
      if (result && "error" in result) {
        setError(result.error as string)
        return
      }
      setDeleteDialogOpen(false)
      setEditingBook(null)
      loadBooks()
    } catch {
      setError("Failed to delete book")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book Management</h1>
          <p className="text-muted-foreground">{books.length} books in catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Book
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, ISBN or RFID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No books found</p>
          <p className="text-sm">Try adjusting your search or add a new book.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Copies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RFID Tag</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-10 h-14 rounded object-cover border bg-muted"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="w-10 h-14 rounded border bg-muted flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate max-w-[200px]">{book.title}</p>
                        <p className="text-xs text-muted-foreground">{book.edition}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{book.author}</TableCell>
                  <TableCell className="text-xs font-mono">{book.isbn}</TableCell>
                  <TableCell>{book.category}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        book.availableCopies === 0 ? "text-destructive font-medium" : ""
                      }
                    >
                      {book.availableCopies}
                    </span>
                    <span className="text-muted-foreground"> / {book.totalCopies}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[book.status] || ""}>
                      {book.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {book.rfidTagId ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono bg-primary/5 px-2 py-0.5 rounded">
                        <QrCode className="w-3 h-3" />
                        {book.rfidTagId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {book.pdfUrl && (
                        <Button variant="ghost" size="icon" onClick={() => openRead(book)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(book)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingBook(book)
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingBook ? "Edit Book" : "Add New Book"}</DialogTitle>
            <DialogDescription>
              {editingBook
                ? "Update book details and catalog information."
                : "Enter the details for the new book."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="details">Book Details</TabsTrigger>
              <TabsTrigger value="media">Media & Description</TabsTrigger>
            </TabsList>

            <ScrollArea className="max-h-[60vh] mt-4">
              <TabsContent value="details" className="space-y-4 p-1 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN *</Label>
                    <Input
                      id="isbn"
                      value={form.isbn}
                      onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={form.publisher}
                      onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearPublished">Year Published</Label>
                    <Input
                      id="yearPublished"
                      type="number"
                      value={form.yearPublished}
                      onChange={(e) =>
                        setForm({ ...form, yearPublished: parseInt(e.target.value) || 2024 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edition">Edition</Label>
                    <Input
                      id="edition"
                      value={form.edition}
                      onChange={(e) => setForm({ ...form, edition: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v ?? "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shelfLocation">Shelf Location</Label>
                    <Input
                      id="shelfLocation"
                      value={form.shelfLocation}
                      onChange={(e) => setForm({ ...form, shelfLocation: e.target.value })}
                      placeholder="e.g. SE-A1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalCopies">Total Copies</Label>
                    <Input
                      id="totalCopies"
                      type="number"
                      min={1}
                      max={50}
                      value={form.totalCopies}
                      onChange={(e) =>
                        setForm({ ...form, totalCopies: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4 p-1 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="coverImage" className="flex items-center gap-1">
                      <Image className="w-3.5 h-3.5" />
                      Cover Image URL
                    </Label>
                    <Input
                      id="coverImage"
                      value={form.coverImage}
                      onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                      placeholder="https://example.com/book-cover.jpg"
                    />
                    {form.coverImage && (
                      <div className="mt-2 flex justify-center">
                        <img
                          src={form.coverImage}
                          alt="Cover preview"
                          className="max-h-40 rounded border object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none"
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdfUrl" className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      PDF URL
                    </Label>
                    <Input
                      id="pdfUrl"
                      value={form.pdfUrl}
                      onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                      placeholder="https://example.com/book.pdf"
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide a URL to the PDF version of the book. The &quot;Read Book&quot; button will open this in an embedded viewer.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="A brief description of the book..."
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.author || !form.isbn}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingBook ? (
                "Save Changes"
              ) : (
                "Add Book"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{editingBook?.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={readDialogOpen} onOpenChange={setReadDialogOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {readingBook?.title}
            </DialogTitle>
            <DialogDescription>
              {readingBook?.author} &bull; ISBN: {readingBook?.isbn}
              {readingBook?.description && (
                <span className="block mt-1 text-sm text-foreground/80">{readingBook.description}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border bg-muted/30">
            {readingBook?.pdfUrl ? (
              <iframe
                src={readingBook.pdfUrl}
                className="w-full h-full"
                title={readingBook.title}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <FileText className="w-12 h-12 mb-2 opacity-40" />
                <p>No PDF URL configured for this book</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadDialogOpen(false)}>
              Close
            </Button>
            {readingBook?.pdfUrl && (
              <a
                href={readingBook.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 h-8 gap-1.5 px-2.5 text-sm font-medium"
              >
                Open in New Tab
              </a>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
