import type { User, Member, Book, Transaction, RFIDTag, AuditEntry, RFIDGateEvent, BorrowRequest, Notification } from "@/types"

type Collection<K extends string, V> = Record<K, V>

interface Database {
  users: Collection<string, User>
  members: Collection<string, Member>
  books: Collection<string, Book>
  transactions: Collection<string, Transaction>
  rfidTags: Collection<string, RFIDTag>
  auditLog: AuditEntry[]
  rfidGateEvents: RFIDGateEvent[]
  sessions: Collection<string, string>
  borrowRequests: Collection<string, BorrowRequest>
  notifications: Collection<string, Notification>
}

declare global {
  var __db: Database | undefined
}

function createEmptyDb(): Database {
  return {
    users: {},
    members: {},
    books: {},
    transactions: {},
    rfidTags: {},
    auditLog: [],
    rfidGateEvents: [],
    sessions: {},
    borrowRequests: {},
    notifications: {},
  }
}

globalThis.__db ??= createEmptyDb()

const db: Database = globalThis.__db

export function getDb(): Database {
  return db
}

export function serializeDb(): string {
  return JSON.stringify(db)
}

export function deserializeDb(data: string): void {
  const parsed = JSON.parse(data) as Database
  db.users = parsed.users || {}
  db.members = parsed.members || {}
  db.books = parsed.books || {}
  db.transactions = parsed.transactions || {}
  db.rfidTags = parsed.rfidTags || {}
  db.auditLog = parsed.auditLog || []
  db.rfidGateEvents = parsed.rfidGateEvents || []
  db.sessions = parsed.sessions || {}
  db.borrowRequests = parsed.borrowRequests || {}
  db.notifications = parsed.notifications || {}
}

export function resetDb(): void {
  const empty = createEmptyDb()
  Object.assign(db, empty)
}

export default db

export const booksDB = {
  getAll(): Book[] {
    return Object.values(db.books).sort((a, b) => a.title.localeCompare(b.title))
  },

  getById(id: string): Book | undefined {
    return db.books[id]
  },

  search(query: string): Book[] {
    const q = query.toLowerCase()
    return Object.values(db.books).filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        (b.category && b.category.toLowerCase().includes(q))
    ).sort((a, b) => a.title.localeCompare(b.title))
  },

  filterByCategory(category: string): Book[] {
    return Object.values(db.books)
      .filter((b) => b.category === category)
      .sort((a, b) => a.title.localeCompare(b.title))
  },

  searchAndFilter(query: string, category: string): Book[] {
    const q = query.toLowerCase()
    const all = category && category !== "all"
      ? Object.values(db.books).filter((b) => b.category === category)
      : Object.values(db.books)

    if (!query) return all.sort((a, b) => a.title.localeCompare(b.title))

    return all.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.rfidTagId?.toLowerCase().includes(q)
    ).sort((a, b) => a.title.localeCompare(b.title))
  },

  create(book: Book): void {
    db.books[book.id] = book
  },

  update(id: string, data: Partial<Book>): Book | null {
    const book = db.books[id]
    if (!book) return null
    Object.assign(book, data, { updatedAt: new Date().toISOString() })
    return book
  },

  delete(id: string): boolean {
    if (!db.books[id]) return false
    delete db.books[id]
    return true
  },

  getCategories(): string[] {
    const categories = new Set(
      Object.values(db.books).map((b) => b.category).filter(Boolean)
    )
    return Array.from(categories).sort()
  },
}
