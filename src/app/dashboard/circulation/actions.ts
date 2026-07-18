"use server"

import { revalidatePath } from "next/cache"
import { addDays, differenceInCalendarDays } from "date-fns"
import type { Transaction, BorrowRequest } from "@/types"
import db from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"
import { calculateFine } from "@/lib/utils"
import { createNotification } from "@/lib/notifications"

const LOAN_PERIOD_DAYS = 14

export async function getTransactions(search?: string, status?: string) {
  await requireRole("admin", "librarian")

  let transactions = Object.values(db.transactions)

  if (status && status !== "all") {
    transactions = transactions.filter((t) => t.status === status)
  }

  if (search) {
    const q = search.toLowerCase()
    transactions = transactions.filter((t) => {
      const book = db.books[t.bookId]
      const member = db.members[t.memberId]
      return (
        book?.title.toLowerCase().includes(q) ||
        member?.firstName.toLowerCase().includes(q) ||
        member?.lastName.toLowerCase().includes(q) ||
        member?.matricNumber.toLowerCase().includes(q)
      )
    })
  }

  return transactions
    .map((t) => {
      const book = db.books[t.bookId]
      const member = db.members[t.memberId]
      return {
        ...t,
        bookTitle: book?.title || "Unknown",
        bookAuthor: book?.author || "",
        memberName: member ? `${member.firstName} ${member.lastName}` : "Unknown",
        memberMatric: member?.matricNumber || "",
        daysOverdue:
          t.status === "active" && new Date(t.dueDate) < new Date()
            ? differenceInCalendarDays(new Date(), new Date(t.dueDate))
            : 0,
      }
    })
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
}

export async function getMemberLoans(memberId: string) {
  await requireAuth()

  const transactions = Object.values(db.transactions)
    .filter((t) => t.memberId === memberId)
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())

  return transactions.map((t) => {
    const book = db.books[t.bookId]
    return {
      ...t,
      bookTitle: book?.title || "Unknown",
      bookAuthor: book?.author || "",
    }
  })
}

export async function issueBook(data: {
  bookId: string
  memberId: string
}) {
  const session = await requireRole("admin", "librarian")

  const book = db.books[data.bookId]
  if (!book) return { error: "Book not found" }
  if (book.availableCopies < 1) return { error: "No copies available for borrowing" }

  const member = db.members[data.memberId]
  if (!member) return { error: "Member not found" }
  if (member.status !== "active") return { error: "Member account is not active" }

  const activeLoans = Object.values(db.transactions).filter(
    (t) => t.memberId === data.memberId && t.status === "active"
  )
  if (activeLoans.length >= member.maxBorrowLimit) {
    return { error: `Member has reached maximum borrow limit (${member.maxBorrowLimit})` }
  }

  const existing = Object.values(db.transactions).find(
    (t) => t.bookId === data.bookId && t.memberId === data.memberId && t.status === "active"
  )
  if (existing) return { error: "Member already has this book on loan" }

  const id = crypto.randomUUID()
  const issueDate = new Date().toISOString()
  const dueDate = addDays(new Date(), LOAN_PERIOD_DAYS).toISOString()

  const transaction: Transaction = {
    id,
    bookId: data.bookId,
    memberId: data.memberId,
    issuedBy: session.userId,
    issueDate,
    dueDate,
    fineAmount: 0,
    finePaid: false,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.transactions[id] = transaction
  book.availableCopies -= 1
  book.updatedAt = new Date().toISOString()

  if (book.availableCopies === 0) {
    book.status = "borrowed"
  }

  createAuditEntry(
    session.userId,
    "issue_book",
    `Issued "${book.title}" to ${member.firstName} ${member.lastName} (Due: ${new Date(dueDate).toLocaleDateString()})`
  )
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return transaction
}

export async function returnBook(transactionId: string) {
  const session = await requireRole("admin", "librarian")

  const transaction = db.transactions[transactionId]
  if (!transaction) return { error: "Transaction not found" }
  if (transaction.status !== "active") return { error: "This book has already been returned" }

  const book = db.books[transaction.bookId]
  if (!book) return { error: "Book not found" }

  const returnDate = new Date().toISOString()
  const fine = calculateFine(transaction.dueDate, returnDate)

  transaction.returnDate = returnDate
  transaction.fineAmount = fine
  transaction.status = fine > 0 && !transaction.finePaid ? "overdue" : "returned"
  transaction.updatedAt = new Date().toISOString()

  book.availableCopies += 1
  book.updatedAt = new Date().toISOString()

  if (book.status === "borrowed" && book.availableCopies > 0) {
    book.status = "available"
  }

  const member = db.members[transaction.memberId]
  const memberName = member ? `${member.firstName} ${member.lastName}` : "Unknown"

  createAuditEntry(
    session.userId,
    "return_book",
    `Returned "${book.title}" by ${memberName}${fine > 0 ? ` (Fine: ₦${fine})` : ""}`
  )
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return transaction
}

export async function payFine(transactionId: string) {
  const session = await requireRole("admin", "librarian")

  const transaction = db.transactions[transactionId]
  if (!transaction) return { error: "Transaction not found" }
  if (transaction.finePaid) return { error: "Fine already paid" }

  transaction.finePaid = true
  transaction.status = "returned"
  transaction.updatedAt = new Date().toISOString()
  createAuditEntry(session.userId, "fine_paid", `Fine of ₦${transaction.fineAmount} paid for transaction ${transactionId}`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return transaction
}

export async function checkOverdueBooks() {
  await requireRole("admin", "librarian")

  const activeTransactions = Object.values(db.transactions).filter(
    (t) => t.status === "active"
  )

  const overdue = activeTransactions.filter(
    (t) => new Date(t.dueDate) < new Date()
  )

  for (const t of overdue) {
    const book = db.books[t.bookId]
    if (book && book.status === "available") {
      book.status = "overdue"
    }
    t.status = "overdue"
    const fine = calculateFine(t.dueDate)
    if (fine > t.fineAmount) {
      t.fineAmount = fine
    }
    t.updatedAt = new Date().toISOString()
  }

  return overdue.map((t) => ({
    transactionId: t.id,
    bookTitle: db.books[t.bookId]?.title || "Unknown",
    memberName: (() => {
      const member = db.members[t.memberId]
      return member ? `${member.firstName} ${member.lastName}` : "Unknown"
    })(),
    daysOverdue: differenceInCalendarDays(new Date(), new Date(t.dueDate)),
    fineAmount: calculateFine(t.dueDate),
  }))
}

export async function requestBorrow(data: {
  bookId: string
  durationDays: number
  format: "digital" | "physical"
}) {
  const session = await requireAuth()

  const user = db.users[session.userId]
  if (!user.memberId) return { error: "No member profile linked to your account" }

  const member = db.members[user.memberId]
  if (!member) return { error: "Member not found" }
  if (member.status !== "active") return { error: "Your account is not active" }

  const book = db.books[data.bookId]
  if (!book) return { error: "Book not found" }

  const activeRequests = Object.values(db.borrowRequests).filter(
    (r) => r.memberId === member.id && r.status === "pending"
  )
  if (activeRequests.length >= 3) {
    return { error: "You have reached the maximum pending requests (3)" }
  }

  const existingRequest = Object.values(db.borrowRequests).find(
    (r) => r.bookId === data.bookId && r.memberId === member.id && r.status === "pending"
  )
  if (existingRequest) {
    return { error: "You already have a pending request for this book" }
  }

  const id = crypto.randomUUID()
  const request: BorrowRequest = {
    id,
    bookId: data.bookId,
    memberId: member.id,
    requestedBy: session.userId,
    durationDays: data.durationDays,
    format: data.format,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.borrowRequests[id] = request
  createAuditEntry(
    session.userId,
    "issue_book",
    `Borrow request: "${book.title}" by ${member.firstName} ${member.lastName} for ${data.durationDays} days (${data.format})`
  )
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard/circulation")
  return request
}

export async function approveRequest(
  requestId: string,
  approvedDuration?: number
) {
  const session = await requireRole("admin", "librarian")

  const request = db.borrowRequests[requestId]
  if (!request) return { error: "Request not found" }
  if (request.status !== "pending") return { error: "Request is no longer pending" }

  const book = db.books[request.bookId]
  if (!book) return { error: "Book not found" }
  if (book.availableCopies < 1) return { error: "No copies available" }

  const member = db.members[request.memberId]
  if (!member || member.status !== "active") return { error: "Member is not active" }

  const duration = approvedDuration || request.durationDays
  const transactionId = crypto.randomUUID()
  const issueDate = new Date().toISOString()
  const dueDate = addDays(new Date(), duration).toISOString()

  const transaction: Transaction = {
    id: transactionId,
    bookId: request.bookId,
    memberId: request.memberId,
    issuedBy: session.userId,
    issueDate,
    dueDate,
    fineAmount: 0,
    finePaid: false,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.transactions[transactionId] = transaction
  book.availableCopies -= 1
  book.updatedAt = new Date().toISOString()
  if (book.availableCopies === 0) book.status = "borrowed"

  request.status = "approved"
  request.approvedBy = session.userId
  request.approvedDuration = duration
  request.transactionId = transactionId
  request.updatedAt = new Date().toISOString()

  const fmtLabel = request.format === "digital" ? "digitally" : "physically"

  createNotification(
    request.requestedBy,
    "borrow_approved",
    `"${book.title}" — Borrow Approved`,
    `Your request to borrow "${book.title}" ${fmtLabel} for ${duration} days has been approved. ${request.format === "digital" ? "You can now read the book from your dashboard." : "Please collect the book from the library."}`,
    transactionId
  )

  createAuditEntry(
    session.userId,
    "issue_book",
    `Approved borrow request: "${book.title}" for ${member.firstName} ${member.lastName} (${duration} days, ${request.format})`
  )

  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard")
  return { success: true, transaction }
}

export async function rejectRequest(
  requestId: string,
  reason: string
) {
  const session = await requireRole("admin", "librarian")

  const request = db.borrowRequests[requestId]
  if (!request) return { error: "Request not found" }
  if (request.status !== "pending") return { error: "Request is no longer pending" }

  const book = db.books[request.bookId]

  request.status = "rejected"
  request.approvedBy = session.userId
  request.rejectionReason = reason
  request.updatedAt = new Date().toISOString()

  createNotification(
    request.requestedBy,
    "borrow_rejected",
    `"${book?.title || "Unknown"}" — Borrow Rejected`,
    `Your request to borrow "${book?.title || "Unknown"}" was not approved. Reason: ${reason}`,
    requestId
  )

  createAuditEntry(
    session.userId,
    "update_book",
    `Rejected borrow request for "${book?.title || "Unknown"}" (Reason: ${reason})`
  )

  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function getPendingRequests() {
  await requireRole("admin", "librarian")

  const requests = Object.values(db.borrowRequests)
    .filter((r) => r.status === "pending")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  return requests.map((r) => {
    const book = db.books[r.bookId]
    const member = db.members[r.memberId]
    const user = db.users[r.requestedBy]
    return {
      ...r,
      bookTitle: book?.title || "Unknown",
      bookAuthor: book?.author || "",
      memberName: member
        ? `${member.firstName} ${member.lastName}`
        : "Unknown",
      memberMatric: member?.matricNumber || "",
      studentEmail: user?.email || "",
    }
  })
}

export async function getStudentRequests() {
  const session = await requireAuth()

  const user = db.users[session.userId]
  if (!user.memberId) return []

  const requests = Object.values(db.borrowRequests)
    .filter((r) => r.memberId === user.memberId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  return requests.map((r) => {
    const book = db.books[r.bookId]
    return {
      ...r,
      bookTitle: book?.title || "Unknown",
      bookAuthor: book?.author || "",
      bookPdfUrl: book?.pdfUrl || null,
    }
  })
}
