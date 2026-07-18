import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import db from "@/lib/db"
import { BookOpen, BookCopy, Clock, AlertTriangle } from "lucide-react"
import { StudentDashboard } from "@/components/features/student-dashboard"
import { getBooks } from "@/app/dashboard/books/actions"

export default async function StudentDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== "student") redirect("/login")

  const user = db.users[session.userId]
  const transactions = Object.values(db.transactions).filter(
    (t) => t.memberId === user.memberId
  )
  const activeLoans = transactions.filter((t) => t.status === "active")
  const overdueLoans = activeLoans.filter((t) => new Date(t.dueDate) < new Date())
  const totalFines = transactions.reduce((sum, t) => sum + (t.fineAmount || 0), 0)

  const books = await getBooks()

  const stats = [
    { label: "Books Available", value: books.reduce((s, b) => s + b.availableCopies, 0), icon: <BookOpen className="w-4 h-4" />, color: "text-blue-600" },
    { label: "My Active Loans", value: activeLoans.length, icon: <BookCopy className="w-4 h-4" />, color: "text-amber-600" },
    { label: "Returned", value: transactions.filter((t) => t.status === "returned").length, icon: <Clock className="w-4 h-4" />, color: "text-green-600" },
    { label: "Overdue", value: overdueLoans.length, icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600" },
    { label: "Total Fines", value: `₦${totalFines.toFixed(2)}`, icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-600" },
  ]

  const transactionsWithBooks = transactions.map((t) => {
    const book = db.books[t.bookId]
    return {
      ...t,
      bookTitle: book?.title || "Unknown",
      bookAuthor: book?.author || "",
      bookPdfUrl: book?.pdfUrl || null,
    }
  })

  return (
    <StudentDashboard
      user={{ firstName: user.firstName, lastName: user.lastName, memberId: user.memberId }}
      stats={stats}
      books={books}
      transactions={transactionsWithBooks}
    />
  )
}
