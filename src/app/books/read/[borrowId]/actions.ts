"use server"

import { querySingle } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function getBorrowedBookData(borrowId: string) {
  const session = await requireAuth()

  const row = await querySingle<Record<string, unknown>>`
    SELECT t.id, t.status, t.member_id,
           b.id as book_id, b.title, b.author, b.pdf_url
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.id = ${borrowId}
  `

  if (!row) throw new Error("This borrow record no longer exists.")

  const user = await querySingle<Record<string, unknown>>`
    SELECT member_id FROM users WHERE id = ${session.userId}
  `

  if (!user?.member_id || row.member_id !== user.member_id) {
    throw new Error("You no longer have access to this book.")
  }

  if (row.status !== "active") {
    throw new Error("You no longer have access to this book.")
  }

  if (!row.pdf_url) {
    throw new Error("No PDF has been uploaded for this title.")
  }

  return {
    title: row.title as string,
    author: row.author as string,
    pdfUrl: row.pdf_url as string,
  }
}
