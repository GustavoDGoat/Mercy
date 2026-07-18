"use server"

import { revalidatePath } from "next/cache"
import type { RFIDGateEvent } from "@/types"
import db from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getRFIDStatus() {
  await requireRole("admin", "librarian")

  const books = Object.values(db.books).filter((b) => b.rfidTagId)

  return books.map((book) => {
    const tag = book.rfidTagId ? db.rfidTags[book.rfidTagId] : null
    const activeLoan = Object.values(db.transactions).find(
      (t) => t.bookId === book.id && t.status === "active"
    )
    const member = activeLoan ? db.members[activeLoan.memberId] : null

    return {
      bookId: book.id,
      title: book.title,
      author: book.author,
      tagId: book.rfidTagId || "N/A",
      tagActive: tag?.isActive ?? false,
      bookStatus: book.status,
      isCheckedOut: !!activeLoan,
      borrowedBy: member ? `${member.firstName} ${member.lastName}` : null,
      lastScanned: tag?.lastScannedAt || null,
    }
  })
}

export async function simulateGateScan(bookId: string) {
  const session = await requireRole("admin", "librarian")

  const book = db.books[bookId]
  if (!book || !book.rfidTagId) return { error: "Book or RFID tag not found" }

  const activeLoan = Object.values(db.transactions).find(
    (t) => t.bookId === bookId && t.status === "active"
  )

  const tag = db.rfidTags[book.rfidTagId]
  if (tag) {
    tag.lastScannedAt = new Date().toISOString()
  }

  const isAuthorized = !!activeLoan
  const event: RFIDGateEvent = {
    id: crypto.randomUUID(),
    bookId,
    bookTitle: book.title,
    tagId: book.rfidTagId,
    memberId: activeLoan?.memberId,
    authorized: isAuthorized,
    triggeredAt: new Date().toISOString(),
  }

  db.rfidGateEvents.push(event)

  if (!isAuthorized) {
    createAuditEntry(
      session.userId,
      "rfid_alarm",
      `🚨 RFID ALARM: "${book.title}" passed exit gate without authorization (Tag: ${book.rfidTagId})`
    )
  }

  revalidatePath("/dashboard/rfid")
  return { event, alarm: !isAuthorized }
}

export async function getGateEvents(limit: number = 50) {
  await requireRole("admin", "librarian")
  return db.rfidGateEvents.slice(-limit).reverse()
}

export async function clearGateEvents() {
  await requireRole("admin", "librarian")
  db.rfidGateEvents = []
  revalidatePath("/dashboard/rfid")
}
