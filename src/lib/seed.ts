import { hashPassword } from "./auth"
import { sql, querySingle, execute } from "./db"
import { generateRFIDTagId } from "./encryption"
import { seedBooks } from "./books-data"

const COVER_PLACEHOLDER = "https://placehold.co/300x400/1a1f44/c89933?text=Book+Cover"
const COPIES = 10

export async function seedDatabase(): Promise<void> {
  const lock = await querySingle<{ locked: boolean }>`
    SELECT pg_try_advisory_lock(987654322) as locked
  `
  if (!lock?.locked) {
    await new Promise((r) => setTimeout(r, 2000))
    return
  }

  try {
    const now = new Date().toISOString()

    const existingUsers = await querySingle<{ cnt: string }>`SELECT COUNT(*) as cnt FROM users`
    const hasUsers = existingUsers && parseInt(existingUsers.cnt) > 0

    if (!hasUsers) {
      const adminId = crypto.randomUUID()
      const adminHash = await hashPassword("admin123")
      await execute`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, created_at, updated_at)
        VALUES (${adminId}, ${"admin@lautech.edu.ng"}, ${adminHash}, ${"Admin"}, ${"User"}, ${"admin"}, ${now}, ${now})
      `
    }

    let added = 0
    let skipped = 0

    for (const book of seedBooks) {
      const existing = await querySingle<{ id: string }>`
        SELECT id FROM books WHERE isbn = ${book.isbn}
      `
      if (existing) {
        skipped++
        continue
      }

      const bookId = crypto.randomUUID()
      const tagId = generateRFIDTagId()
      const rfidId = crypto.randomUUID()

      await execute`
        INSERT INTO books (id, isbn, title, author, publisher, year_published, edition, category, shelf_location, total_copies, available_copies, rfid_tag_id, pdf_url, cover_image, description, status, created_at, updated_at)
        VALUES (${bookId}, ${book.isbn}, ${book.title}, ${book.author}, ${book.publisher}, ${book.year}, ${book.edition}, ${book.category}, ${book.shelf}, ${COPIES}, ${COPIES}, ${tagId}, ${book.pdfUrl}, ${COVER_PLACEHOLDER}, ${book.description}, ${"available"}, ${now}, ${now})
      `

      await execute`
        INSERT INTO rfid_tags (id, tag_id, book_id, is_active, created_at)
        VALUES (${rfidId}, ${tagId}, ${bookId}, true, ${now})
      `

      added++
    }

    console.log(`[Seed] Books: ${added} added, ${skipped} skipped (${seedBooks.length} total)`)
  } finally {
    await execute`SELECT pg_advisory_unlock(987654322)`
  }
}
