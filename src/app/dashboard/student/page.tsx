import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql, querySingle } from "@/lib/db"
import { BookOpen, BookCopy, Clock, AlertTriangle } from "lucide-react"
import { StudentDashboard } from "@/components/features/student-dashboard"
import { getBooks } from "@/app/dashboard/books/actions"
import { getMemberLoans } from "@/app/dashboard/circulation/actions"

export default async function StudentDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== "student") redirect("/login")

  const user = await querySingle<Record<string, unknown>>`
    SELECT id, first_name, last_name, email, role, member_id FROM users WHERE id = ${session.userId}
  `
  if (!user) redirect("/login")

  const [books, transactions, statsData] = await Promise.all([
    getBooks(),
    getMemberLoans(user.member_id as string),
    Promise.all([
      querySingle<{ avail: string }>`SELECT COALESCE(SUM(available_copies), 0)::text as avail FROM books`,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE member_id = ${user.member_id} AND status = 'active'`,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE member_id = ${user.member_id} AND status = 'returned'`,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE member_id = ${user.member_id} AND status IN ('active', 'overdue') AND due_date < NOW()`,
      querySingle<{ sum: string }>`SELECT COALESCE(SUM(fine_amount), 0)::text as sum FROM transactions WHERE member_id = ${user.member_id}`,
    ]),
  ])

  const [availRow, activeRow, returnedRow, overdueRow, fineRow] = statsData
  const stats = [
    { label: "Books Available", value: availRow?.avail || "0", icon: <BookOpen className="w-4 h-4" />, color: "text-blue-600" },
    { label: "My Active Loans", value: activeRow?.cnt || "0", icon: <BookCopy className="w-4 h-4" />, color: "text-amber-600" },
    { label: "Returned", value: returnedRow?.cnt || "0", icon: <Clock className="w-4 h-4" />, color: "text-green-600" },
    { label: "Overdue", value: overdueRow?.cnt || "0", icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600" },
    { label: "Total Fines", value: `₦${Number(fineRow?.sum || 0).toFixed(2)}`, icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-600" },
  ]

  return (
    <StudentDashboard
      user={{ firstName: user.first_name as string, lastName: user.last_name as string, memberId: user.member_id as string }}
      stats={stats}
      books={books}
      transactions={transactions}
    />
  )
}
