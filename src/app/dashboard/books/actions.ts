"use server"

import { revalidatePath } from "next/cache"
import type { Book, RFIDTag } from "@/types"
import db from "@/lib/db"
import { generateRFIDTagId } from "@/lib/encryption"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getBooks(search?: string, category?: string) {
  await requireAuth()

  let books = Object.values(db.books)

  if (search) {
    const q = search.toLowerCase()
    books = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.rfidTagId?.toLowerCase().includes(q)
    )
  }

  if (category && category !== "all") {
    books = books.filter((b) => b.category === category)
  }

  return books.sort((a, b) => a.title.localeCompare(b.title))
}

export async function getBook(bookId: string) {
  await requireRole("admin", "librarian")
  return db.books[bookId] || null
}

export async function createBook(data: {
  isbn: string
  title: string
  author: string
  publisher: string
  yearPublished: number
  edition: string
  category: string
  shelfLocation: string
  totalCopies: number
  pdfUrl?: string
  coverImage?: string
  description?: string
}) {
  const session = await requireRole("admin", "librarian")

  const id = crypto.randomUUID()
  const tagId = generateRFIDTagId()

  const book: Book = {
    id,
    isbn: data.isbn,
    title: data.title,
    author: data.author,
    publisher: data.publisher,
    yearPublished: data.yearPublished,
    edition: data.edition,
    category: data.category,
    shelfLocation: data.shelfLocation,
    totalCopies: data.totalCopies,
    availableCopies: data.totalCopies,
    rfidTagId: tagId,
    pdfUrl: data.pdfUrl,
    coverImage: data.coverImage,
    description: data.description,
    status: "available",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.books[id] = book

  const rfidTag: RFIDTag = {
    id: crypto.randomUUID(),
    tagId,
    bookId: id,
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  db.rfidTags[tagId] = rfidTag
  createAuditEntry(session.userId, "create_book", `Added book: ${book.title} (ISBN: ${book.isbn})`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return book
}

export async function updateBook(
  bookId: string,
  data: Partial<{
    isbn: string
    title: string
    author: string
    publisher: string
    yearPublished: number
    edition: string
    category: string
    shelfLocation: string
    totalCopies: number
    availableCopies: number
    pdfUrl: string | null
    coverImage: string | null
    description: string | null
  }>
) {
  const session = await requireRole("admin", "librarian")

  const book = db.books[bookId]
  if (!book) return { error: "Book not found" }

  const cleanedData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleanedData[key] = value === null ? undefined : value
  }

  Object.assign(book, cleanedData, { updatedAt: new Date().toISOString() })
  createAuditEntry(session.userId, "update_book", `Updated book: ${book.title}`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return book
}

export async function deleteBook(bookId: string) {
  const session = await requireRole("admin", "librarian")

  const book = db.books[bookId]
  if (!book) return { error: "Book not found" }

  const activeLoan = Object.values(db.transactions).find(
    (t) => t.bookId === bookId && t.status === "active"
  )
  if (activeLoan) return { error: "Cannot delete a book that is currently borrowed" }

  if (book.rfidTagId) delete db.rfidTags[book.rfidTagId]
  delete db.books[bookId]
  createAuditEntry(session.userId, "delete_book", `Deleted book: ${book.title}`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function getCategories() {
  await requireAuth()
  const categories = new Set(Object.values(db.books).map((b) => b.category))
  return Array.from(categories).sort()
}
