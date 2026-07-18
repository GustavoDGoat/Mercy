"use server"

import { revalidatePath } from "next/cache"
import { sql, querySingle, execute } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getRFIDStatus() {
  await requireRole("admin", "librarian")

  const rows = await sql<Record<string, unknown>>`
    SELECT b.id as book_id, b.title, b.author, b.rfid_tag_id, b.status as book_status,
      rt.is_active as tag_active, rt.last_scanned_at,
      t.id as transaction_id,
      m.first_name as m_first, m.last_name as m_last
    FROM books b
    LEFT JOIN rfid_tags rt ON b.rfid_tag_id = rt.tag_id
    LEFT JOIN transactions t ON b.id = t.book_id AND t.status = 'active'
    LEFT JOIN members m ON t.member_id = m.id
    WHERE b.rfid_tag_id IS NOT NULL
    ORDER BY b.title
  `

  return rows.map((r) => ({
    bookId: r.book_id as string, title: r.title as string, author: r.author as string,
    tagId: (r.rfid_tag_id as string) || "N/A", tagActive: (r.tag_active as boolean) || false,
    bookStatus: r.book_status as string, isCheckedOut: !!r.transaction_id,
    borrowedBy: r.m_first ? `${r.m_first} ${r.m_last}` : null,
    lastScanned: (r.last_scanned_at as string) || null,
  }))
}

export async function simulateGateScan(bookId: string) {
  const session = await requireRole("admin", "librarian")

  const book = await querySingle<Record<string, unknown>>`
    SELECT * FROM books WHERE id = ${bookId}
  `
  if (!book?.rfid_tag_id) return { error: "Book or RFID tag not found" }

  const activeLoan = await querySingle<Record<string, unknown>>`
    SELECT id, member_id FROM transactions WHERE book_id = ${bookId} AND status = 'active'
  `

  const now = new Date().toISOString()
  await execute`
    UPDATE rfid_tags SET last_scanned_at = ${now} WHERE tag_id = ${book.rfid_tag_id}
  `

  const isAuthorized = !!activeLoan
  const eventId = crypto.randomUUID()

  await execute`
    INSERT INTO rfid_gate_events (id, book_id, book_title, tag_id, member_id, authorized, triggered_at)
    VALUES (${eventId}, ${bookId}, ${book.title}, ${book.rfid_tag_id}, ${activeLoan?.member_id || null}, ${isAuthorized}, ${now})
  `

  if (!isAuthorized) {
    await createAuditEntry(session.userId, "rfid_alarm", `🚨 RFID ALARM: "${book.title}" passed exit gate without authorization (Tag: ${book.rfid_tag_id})`)
  }

  revalidatePath("/dashboard/rfid")
  return { event: { id: eventId, bookId, bookTitle: book.title, tagId: book.rfid_tag_id, authorized: isAuthorized, triggeredAt: now }, alarm: !isAuthorized }
}

export async function getGateEvents(limit: number = 50) {
  await requireRole("admin", "librarian")

  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM rfid_gate_events ORDER BY triggered_at DESC LIMIT ${limit}
  `

  return rows.map((r) => ({
    id: r.id as string, bookId: r.book_id as string, bookTitle: r.book_title as string,
    tagId: r.tag_id as string, memberId: r.member_id as string | undefined,
    authorized: r.authorized as boolean, triggeredAt: r.triggered_at as string,
  }))
}

export async function clearGateEvents() {
  await requireRole("admin", "librarian")
  await execute`DELETE FROM rfid_gate_events`
  revalidatePath("/dashboard/rfid")
}
