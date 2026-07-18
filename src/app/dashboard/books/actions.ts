"use server"

import { revalidatePath } from "next/cache"
import { sql, querySingle, execute } from "@/lib/db"
import { generateRFIDTagId } from "@/lib/encryption"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"
import type { Book } from "@/types"

export async function getBooks(search?: string, category?: string) {
  await requireAuth()

  let where = ""
  const params: unknown[] = []

  if (search) {
    const q = `%${search.toLowerCase()}%`
    where += ` AND (LOWER(title) LIKE $${params.length + 1} OR LOWER(author) LIKE $${params.length + 2} OR isbn LIKE $${params.length + 3} OR rfid_tag_id LIKE $${params.length + 4})`
    params.push(q, q, q, q)
  }
  if (category && category !== "all") {
    where += ` AND category = $${params.length + 1}`
    params.push(category)
  }

  const query = `SELECT * FROM books WHERE 1=1 ${where} ORDER BY title ASC`
  const rows = await sql<Record<string, unknown>>(query, ...params)

  return rows.map(mapBook)
}

export async function getBook(bookId: string) {
  await requireRole("admin", "librarian")
  const row = await querySingle<Record<string, unknown>>`SELECT * FROM books WHERE id = ${bookId}`
  return row ? mapBook(row) : null
}

export async function createBook(data: {
  isbn: string; title: string; author: string; publisher: string
  yearPublished: number; edition: string; category: string
  shelfLocation: string; totalCopies: number
  pdfUrl?: string; coverImage?: string; description?: string
}) {
  const session = await requireRole("admin", "librarian")
  const id = crypto.randomUUID()
  const tagId = generateRFIDTagId()
  const rfidId = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute`
    INSERT INTO books (id, isbn, title, author, publisher, year_published, edition, category, shelf_location, total_copies, available_copies, rfid_tag_id, pdf_url, cover_image, description, status, created_at, updated_at)
    VALUES (${id}, ${data.isbn}, ${data.title}, ${data.author}, ${data.publisher}, ${data.yearPublished}, ${data.edition}, ${data.category}, ${data.shelfLocation}, ${data.totalCopies}, ${data.totalCopies}, ${tagId}, ${data.pdfUrl || null}, ${data.coverImage || null}, ${data.description || null}, ${"available"}, ${now}, ${now})
  `

  await execute`
    INSERT INTO rfid_tags (id, tag_id, book_id, is_active, created_at)
    VALUES (${rfidId}, ${tagId}, ${id}, true, ${now})
  `

  await createAuditEntry(session.userId, "create_book", `Added book: ${data.title} (ISBN: ${data.isbn})`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return { id, ...data, rfidTagId: tagId, status: "available", availableCopies: data.totalCopies, createdAt: now, updatedAt: now }
}

export async function updateBook(bookId: string, data: Record<string, unknown>) {
  const session = await requireRole("admin", "librarian")

  const book = await querySingle<Record<string, unknown>>`SELECT * FROM books WHERE id = ${bookId}`
  if (!book) return { error: "Book not found" }

  const updates: string[] = []
  const vals: unknown[] = []
  let idx = 0

  const fieldMap: Record<string, string> = {
    isbn: "isbn", title: "title", author: "author", publisher: "publisher",
    yearPublished: "year_published", edition: "edition", category: "category",
    shelfLocation: "shelf_location", totalCopies: "total_copies",
    availableCopies: "available_copies", pdfUrl: "pdf_url",
    coverImage: "cover_image", description: "description",
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    const val = data[key]
    if (val !== undefined) {
      updates.push(`${col} = $${++idx}`)
      vals.push(val === null ? null : val)
    }
  }

  if (updates.length === 0) return book

  updates.push(`updated_at = $${++idx}`)
  vals.push(new Date().toISOString())
  vals.push(bookId)

  const updateQuery = `UPDATE books SET ${updates.join(", ")} WHERE id = $${++idx}`
  await execute(updateQuery, ...vals)
  await createAuditEntry(session.userId, "update_book", `Updated book: ${data.title || book.title}`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return { ...book, ...data }
}

export async function deleteBook(bookId: string) {
  const session = await requireRole("admin", "librarian")

  const book = await querySingle<Record<string, unknown>>`SELECT * FROM books WHERE id = ${bookId}`
  if (!book) return { error: "Book not found" }

  const activeLoan = await querySingle`
    SELECT id FROM transactions WHERE book_id = ${bookId} AND status = 'active'
  `
  if (activeLoan) return { error: "Cannot delete a book that is currently borrowed" }

  await execute`DELETE FROM rfid_tags WHERE book_id = ${bookId}`
  await execute`DELETE FROM books WHERE id = ${bookId}`
  await createAuditEntry(session.userId, "delete_book", `Deleted book: ${book.title}`)
  revalidatePath("/dashboard/books")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function getCategories() {
  await requireAuth()
  const rows = await sql<{ category: string }>`SELECT DISTINCT category FROM books WHERE category IS NOT NULL ORDER BY category`
  return rows.map((r) => r.category)
}

function mapBook(r: Record<string, unknown>): Book {
  return {
    id: r.id as string,
    isbn: r.isbn as string,
    title: r.title as string,
    author: r.author as string,
    publisher: (r.publisher as string) || "",
    yearPublished: (r.year_published as number) || 0,
    edition: (r.edition as string) || "",
    category: (r.category as string) || "",
    shelfLocation: (r.shelf_location as string) || "",
    totalCopies: (r.total_copies as number) || 0,
    availableCopies: (r.available_copies as number) || 0,
    rfidTagId: r.rfid_tag_id as string | undefined,
    pdfUrl: r.pdf_url as string | undefined,
    coverImage: r.cover_image as string | undefined,
    description: r.description as string | undefined,
    status: (r.status as string) || "available",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  } as Book
}
