"use server"

import { revalidatePath } from "next/cache"
import { addDays } from "date-fns"
import { sql, querySingle, execute } from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"
import { createNotification } from "@/lib/notifications"

const LOAN_PERIOD_DAYS = 14

export async function getTransactions(search?: string, status?: string) {
  await requireRole("admin", "librarian")

  let where = ""
  const params: unknown[] = []

  if (status && status !== "all") {
    where += ` AND t.status = $${params.length + 1}`
    params.push(status)
  }

  const txQuery = `
    SELECT t.*, b.title as book_title, b.author as book_author,
      m.first_name as m_first, m.last_name as m_last, m.matric_number as m_matric
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN members m ON t.member_id = m.id
    WHERE 1=1 ${where}
    ORDER BY t.issue_date DESC
  `
  const rows = await sql<Record<string, unknown>>(txQuery, ...params)

  let results: Array<{
    id: string; bookId: string; memberId: string; issuedBy: string;
    issueDate: string; dueDate: string;     returnDate: string | undefined;
    fineAmount: number; finePaid: boolean; status: string;
    createdAt: string; updatedAt: string;
    bookTitle: string; bookAuthor: string;
    memberName: string; memberMatric: string; daysOverdue: number;
  }> = rows.map((r) => ({
    id: r.id as string, bookId: r.book_id as string, memberId: r.member_id as string, issuedBy: r.issued_by as string,
    issueDate: r.issue_date as string, dueDate: r.due_date as string,     returnDate: (r.return_date as string) || undefined,
    fineAmount: Number(r.fine_amount) || 0, finePaid: (r.fine_paid as boolean) || false,
    status: r.status as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    bookTitle: (r.book_title as string) || "Unknown", bookAuthor: (r.book_author as string) || "",
    memberName: `${r.m_first} ${r.m_last}`,
    memberMatric: (r.m_matric as string) || "",
    daysOverdue: r.status === "active" && new Date(r.due_date as string) < new Date()
      ? Math.ceil((Date.now() - new Date(r.due_date as string).getTime()) / 86400000)
      : 0,
  }))

  if (search) {
    const q = search.toLowerCase()
    results = results.filter((r) =>
      r.bookTitle.toLowerCase().includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      r.memberMatric.toLowerCase().includes(q)
    )
  }

  return results
}

export async function getMemberLoans(memberId: string) {
  await requireAuth()

  const rows = await sql<Record<string, unknown>>`
    SELECT t.*, b.title as book_title, b.author as book_author, b.pdf_url as book_pdf_url
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.member_id = ${memberId}
    ORDER BY t.issue_date DESC
  `

  return rows.map((r) => ({
    id: r.id as string, bookId: r.book_id as string, memberId: r.member_id as string, issuedBy: r.issued_by as string,
    issueDate: r.issue_date as string, dueDate: r.due_date as string, returnDate: (r.return_date as string) || undefined,
    fineAmount: Number(r.fine_amount) || 0, finePaid: (r.fine_paid as boolean) || false,
    status: r.status as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    bookTitle: (r.book_title as string) || "Unknown", bookAuthor: (r.book_author as string) || "",
    bookPdfUrl: (r.book_pdf_url as string) || null,
  }))
}

export async function issueBook(data: { bookId: string; memberId: string }) {
  const session = await requireRole("admin", "librarian")

  const book = await querySingle<Record<string, unknown>>`SELECT * FROM books WHERE id = ${data.bookId}`
  if (!book) return { error: "Book not found" }
  if ((book.available_copies as number) < 1) return { error: "No copies available" }

  const member = await querySingle<Record<string, unknown>>`SELECT * FROM members WHERE id = ${data.memberId}`
  if (!member) return { error: "Member not found" }
  if (member.status !== "active") return { error: "Member account is not active" }

  const activeCount = await querySingle<{ cnt: string }>`
    SELECT COUNT(*) as cnt FROM transactions WHERE member_id = ${data.memberId} AND status = 'active'
  `
  if (activeCount && parseInt(activeCount.cnt) >= ((member.max_borrow_limit as number) || 4)) {
    return { error: `Member has reached maximum borrow limit` }
  }

  const existing = await querySingle`
    SELECT id FROM transactions
    WHERE book_id = ${data.bookId} AND member_id = ${data.memberId} AND status = 'active'
  `
  if (existing) return { error: "Member already has this book on loan" }

  const id = crypto.randomUUID()
  const issueDate = new Date().toISOString()
  const dueDate = addDays(new Date(), LOAN_PERIOD_DAYS).toISOString()
  const now = new Date().toISOString()

  await execute`
    INSERT INTO transactions (id, book_id, member_id, issued_by, issue_date, due_date, fine_amount, fine_paid, status, created_at, updated_at)
    VALUES (${id}, ${data.bookId}, ${data.memberId}, ${session.userId}, ${issueDate}, ${dueDate}, 0, false, 'active', ${now}, ${now})
  `

  await execute`UPDATE books SET available_copies = available_copies - 1, updated_at = ${now} WHERE id = ${data.bookId}`
  await execute`
    UPDATE books SET status = 'borrowed', updated_at = ${now}
    WHERE id = ${data.bookId} AND available_copies = 0
  `

  await createAuditEntry(session.userId, "issue_book", `Issued "${book.title}" to ${member.first_name} ${member.last_name}`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return { id, bookId: data.bookId, memberId: data.memberId, issueDate, dueDate, status: "active" }
}

export async function returnBook(transactionId: string) {
  const session = await requireRole("admin", "librarian")

  const tx = await querySingle<Record<string, unknown>>`SELECT * FROM transactions WHERE id = ${transactionId}`
  if (!tx) return { error: "Transaction not found" }
  if (tx.status !== "active") return { error: "This book has already been returned" }

  const now = new Date().toISOString()
  const dueDate = new Date(tx.due_date as string)
  const daysOverdue = Math.max(0, Math.ceil((Date.now() - dueDate.getTime()) / 86400000))
  const fine = daysOverdue * 50

  await execute`
    UPDATE transactions SET return_date = ${now}, fine_amount = ${fine}, status = ${fine > 0 ? "returned" : "returned"}, updated_at = ${now}
    WHERE id = ${transactionId}
  `

  await execute`UPDATE books SET available_copies = available_copies + 1, updated_at = ${now} WHERE id = ${tx.book_id}`
  await execute`UPDATE books SET status = 'available', updated_at = ${now} WHERE id = ${tx.book_id} AND status = 'borrowed' AND available_copies > 0`

  const book = await querySingle<Record<string, unknown>>`SELECT title FROM books WHERE id = ${tx.book_id}`
  const member = await querySingle<Record<string, unknown>>`SELECT first_name, last_name FROM members WHERE id = ${tx.member_id}`

  await createAuditEntry(session.userId, "return_book", `Returned "${book?.title}" by ${member?.first_name} ${member?.last_name}${fine > 0 ? ` (Fine: ₦${fine})` : ""}`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return { ...tx, fineAmount: fine, returnDate: now, status: fine > 0 ? "returned" : "returned" }
}

export async function payFine(transactionId: string) {
  const session = await requireRole("admin", "librarian")

  const tx = await querySingle<Record<string, unknown>>`SELECT * FROM transactions WHERE id = ${transactionId}`
  if (!tx) return { error: "Transaction not found" }
  if (tx.fine_paid) return { error: "Fine already paid" }

  await execute`
    UPDATE transactions SET fine_paid = true, status = 'returned', updated_at = ${new Date().toISOString()}
    WHERE id = ${transactionId}
  `

  await createAuditEntry(session.userId, "fine_paid", `Fine of ₦${tx.fine_amount} paid for transaction ${transactionId}`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function checkOverdueBooks() {
  await requireRole("admin", "librarian")

  const rows = await sql<Record<string, unknown>>`
    SELECT t.id, t.due_date, b.title as book_title,
      m.first_name as m_first, m.last_name as m_last
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    JOIN members m ON t.member_id = m.id
    WHERE t.status = 'active' AND t.due_date < NOW()
  `

  for (const r of rows) {
    const days = Math.ceil((Date.now() - new Date(r.due_date as string).getTime()) / 86400000)
    const fine = days * 50
    await execute`
      UPDATE transactions SET status = 'overdue', fine_amount = ${fine}, updated_at = ${new Date().toISOString()}
      WHERE id = ${r.id}
    `
  }

  return rows.map((r) => ({
    transactionId: r.id as string,
    bookTitle: r.book_title as string,
    memberName: `${r.m_first} ${r.m_last}`,
    daysOverdue: Math.ceil((Date.now() - new Date(r.due_date as string).getTime()) / 86400000),
    fineAmount: Math.ceil((Date.now() - new Date(r.due_date as string).getTime()) / 86400000) * 50,
  }))
}

export async function requestBorrow(data: { bookId: string; durationDays: number; format: "digital" | "physical" }) {
  const session = await requireAuth()

  const user = await querySingle<Record<string, unknown>>`SELECT member_id FROM users WHERE id = ${session.userId}`
  if (!user?.member_id) return { error: "No member profile linked to your account" }

  const member = await querySingle<Record<string, unknown>>`SELECT * FROM members WHERE id = ${user.member_id}`
  if (!member) return { error: "Member not found" }
  if (member.status !== "active") return { error: "Your account is not active" }

  const book = await querySingle<Record<string, unknown>>`SELECT title FROM books WHERE id = ${data.bookId}`
  if (!book) return { error: "Book not found" }

  const pendingCount = await querySingle<{ cnt: string }>`
    SELECT COUNT(*) as cnt FROM borrow_requests WHERE member_id = ${user.member_id} AND status = 'pending'
  `
  if (pendingCount && parseInt(pendingCount.cnt) >= 3) {
    return { error: "You have reached the maximum pending requests (3)" }
  }

  const existing = await querySingle`
    SELECT id FROM borrow_requests WHERE book_id = ${data.bookId} AND member_id = ${user.member_id} AND status = 'pending'
  `
  if (existing) return { error: "You already have a pending request for this book" }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute`
    INSERT INTO borrow_requests (id, book_id, member_id, requested_by, duration_days, format, status, created_at, updated_at)
    VALUES (${id}, ${data.bookId}, ${user.member_id}, ${session.userId}, ${data.durationDays}, ${data.format}, 'pending', ${now}, ${now})
  `

  await createAuditEntry(session.userId, "issue_book", `Borrow request: "${book.title}" for ${data.durationDays} days (${data.format})`)
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard/circulation")
  return { id, bookId: data.bookId, memberId: user.member_id, durationDays: data.durationDays, format: data.format, status: "pending" }
}

export async function approveRequest(requestId: string, approvedDuration?: number) {
  const session = await requireRole("admin", "librarian")

  const req = await querySingle<Record<string, unknown>>`SELECT * FROM borrow_requests WHERE id = ${requestId}`
  if (!req) return { error: "Request not found" }
  if (req.status !== "pending") return { error: "Request is no longer pending" }

  const book = await querySingle<Record<string, unknown>>`SELECT * FROM books WHERE id = ${req.book_id}`
  if (!book) return { error: "Book not found" }
  if ((book.available_copies as number) < 1) return { error: "No copies available" }

  const duration = approvedDuration || (req.duration_days as number)
  const transactionId = crypto.randomUUID()
  const issueDate = new Date().toISOString()
  const dueDate = addDays(new Date(), duration).toISOString()
  const now = new Date().toISOString()

  await execute`
    INSERT INTO transactions (id, book_id, member_id, issued_by, issue_date, due_date, fine_amount, fine_paid, status, created_at, updated_at)
    VALUES (${transactionId}, ${req.book_id}, ${req.member_id}, ${session.userId}, ${issueDate}, ${dueDate}, 0, false, 'active', ${now}, ${now})
  `

  await execute`UPDATE books SET available_copies = available_copies - 1, updated_at = ${now} WHERE id = ${req.book_id}`
  await execute`UPDATE books SET status = 'borrowed', updated_at = ${now} WHERE id = ${req.book_id} AND available_copies = 0`

  await execute`
    UPDATE borrow_requests SET status = 'approved', approved_by = ${session.userId}, approved_duration = ${duration}, transaction_id = ${transactionId}, updated_at = ${now} WHERE id = ${requestId}
  `

  const fmtLabel = req.format === "digital" ? "digitally" : "physically"
  await createNotification(
    req.requested_by as string,
    "borrow_approved",
    `"${book.title}" — Borrow Approved`,
    `Your request to borrow "${book.title}" ${fmtLabel} for ${duration} days has been approved.`,
    transactionId
  )

  await createAuditEntry(session.userId, "issue_book", `Approved borrow request: "${book.title}" (${duration} days, ${req.format})`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function rejectRequest(requestId: string, reason: string) {
  const session = await requireRole("admin", "librarian")

  const req = await querySingle<Record<string, unknown>>`SELECT * FROM borrow_requests WHERE id = ${requestId}`
  if (!req) return { error: "Request not found" }
  if (req.status !== "pending") return { error: "Request is no longer pending" }

  const book = await querySingle<Record<string, unknown>>`SELECT title FROM books WHERE id = ${req.book_id}`

  await execute`
    UPDATE borrow_requests SET status = 'rejected', approved_by = ${session.userId}, rejection_reason = ${reason}, updated_at = ${new Date().toISOString()} WHERE id = ${requestId}
  `

  await createNotification(
    req.requested_by as string,
    "borrow_rejected",
    `"${book?.title || "Unknown"}" — Borrow Rejected`,
    `Your request was not approved. Reason: ${reason}`,
    requestId
  )

  await createAuditEntry(session.userId, "update_book", `Rejected borrow request for "${book?.title || "Unknown"}"`)
  revalidatePath("/dashboard/circulation")
  revalidatePath("/dashboard/student")
  revalidatePath("/dashboard")
  return { success: true }
}

export async function getPendingRequests() {
  await requireRole("admin", "librarian")

  const pendingRows = await sql<Record<string, unknown>>`
    SELECT br.*, b.title as book_title, b.author as book_author,
      m.first_name as m_first, m.last_name as m_last, m.matric_number as m_matric,
      u.email as student_email
    FROM borrow_requests br
    JOIN books b ON br.book_id = b.id
    JOIN members m ON br.member_id = m.id
    JOIN users u ON br.requested_by = u.id
    WHERE br.status = 'pending'
    ORDER BY br.created_at DESC
  `

  return pendingRows.map((r) => ({
    id: r.id as string, bookId: r.book_id as string, memberId: r.member_id as string, requestedBy: r.requested_by as string,
    durationDays: r.duration_days as number, format: r.format as string,
    status: r.status as string, approvedBy: r.approved_by as string | undefined,
    approvedDuration: r.approved_duration as number | undefined, rejectionReason: r.rejection_reason as string | undefined,
    transactionId: r.transaction_id as string | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    bookTitle: r.book_title as string, bookAuthor: r.book_author as string,
    memberName: `${r.m_first} ${r.m_last}`,
    memberMatric: r.m_matric as string,     studentEmail: r.student_email as string,
  }))
}

export async function getStudentRequests() {
  const session = await requireAuth()

  const user = await querySingle<Record<string, unknown>>`SELECT member_id FROM users WHERE id = ${session.userId}`
  if (!user?.member_id) return []

  const rows = await sql<Record<string, unknown>>`
    SELECT br.*, b.title as book_title, b.author as book_author, b.pdf_url as book_pdf_url
    FROM borrow_requests br
    JOIN books b ON br.book_id = b.id
    WHERE br.member_id = ${user.member_id}
    ORDER BY br.created_at DESC
  `

  return rows.map((r) => ({
    id: r.id as string, bookId: r.book_id as string, memberId: r.member_id as string, requestedBy: r.requested_by as string,
    durationDays: r.duration_days as number, format: r.format as string,
    status: r.status as string, approvedBy: r.approved_by as string | undefined,
    approvedDuration: r.approved_duration as number | undefined, rejectionReason: r.rejection_reason as string | undefined,
    transactionId: r.transaction_id as string | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
    bookTitle: r.book_title as string, bookAuthor: r.book_author as string, bookPdfUrl: r.book_pdf_url as string | null,
  }))
}
