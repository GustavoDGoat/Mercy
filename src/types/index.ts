export type UserRole = "student" | "librarian" | "admin"

export type BookStatus = "available" | "borrowed" | "overdue" | "lost"

export type MemberStatus = "active" | "suspended" | "inactive"

export type TransactionStatus = "active" | "returned" | "overdue" | "lost"

export type AuditAction =
  | "login"
  | "logout"
  | "create_book"
  | "update_book"
  | "delete_book"
  | "register_member"
  | "update_member"
  | "delete_member"
  | "issue_book"
  | "return_book"
  | "overdue_detected"
  | "fine_paid"
  | "rfid_alarm"

export interface User {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: UserRole
  memberId?: string
  fingerprintHash: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  userId?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  matricNumber: string
  department: string
  faculty: string
  level: string
  maxBorrowLimit: number
  status: MemberStatus
  age?: string
  height?: string
  weight?: string
  religion?: string
  state?: string
  lga?: string
  address?: string
  nin?: string
  registeredAt: string
  updatedAt: string
}

export interface RFIDTag {
  id: string
  tagId: string
  bookId: string
  isActive: boolean
  lastScannedAt?: string
  createdAt: string
}

export interface Book {
  id: string
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
  rfidTagId?: string
  pdfUrl?: string
  coverImage?: string
  description?: string
  status: BookStatus
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  bookId: string
  memberId: string
  issuedBy: string
  issueDate: string
  dueDate: string
  returnDate?: string
  fineAmount: number
  finePaid: boolean
  status: TransactionStatus
  createdAt: string
  updatedAt: string
}

export interface AuditEntry {
  id: string
  userId: string
  action: AuditAction
  details: string
  ipAddress?: string
  timestamp: string
  hash: string
  previousHash: string
}

export interface DashboardStats {
  totalBooks: number
  availableBooks: number
  borrowedBooks: number
  overdueBooks: number
  totalMembers: number
  activeTransactions: number
  totalFines: number
  recentTransactions: Transaction[]
}

export interface OverdueAlert {
  transactionId: string
  bookTitle: string
  memberName: string
  daysOverdue: number
  fineAmount: number
}

export interface RFIDGateEvent {
  id: string
  bookId: string
  bookTitle: string
  tagId: string
  memberId?: string
  authorized: boolean
  triggeredAt: string
}

export type BorrowFormat = "digital" | "physical"

export type BorrowRequestStatus = "pending" | "approved" | "rejected"

export interface BorrowRequest {
  id: string
  bookId: string
  memberId: string
  requestedBy: string
  durationDays: number
  format: BorrowFormat
  status: BorrowRequestStatus
  approvedBy?: string
  approvedDuration?: number
  rejectionReason?: string
  transactionId?: string
  createdAt: string
  updatedAt: string
}

export type NotificationType = "borrow_approved" | "borrow_rejected" | "due_soon" | "overdue"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  read: boolean
  createdAt: string
}
