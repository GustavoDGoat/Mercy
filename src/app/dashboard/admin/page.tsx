import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql, querySingle } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, BookCopy, DollarSign, AlertTriangle } from "lucide-react"

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== "admin") redirect("/login")

  const [bookStats, memberCount, activeCount, overdueCount, fineTotal] = await Promise.all([
    sql<{ total: string; avail: string }>`
      SELECT COUNT(*)::text as total, COALESCE(SUM(available_copies), 0)::text as avail FROM books
    `,
    querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM members`,
    querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE status = 'active'`,
    querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE status = 'active' AND due_date < NOW()`,
    querySingle<{ sum: string }>`SELECT COALESCE(SUM(fine_amount), 0)::text as sum FROM transactions`,
  ])

  const books = bookStats[0]
  const stats = [
    { label: "Total Books", value: books.total, icon: BookOpen, color: "text-blue-600" },
    { label: "Available", value: books.avail, icon: BookCopy, color: "text-green-600" },
    { label: "Members", value: memberCount?.cnt || "0", icon: Users, color: "text-purple-600" },
    { label: "Active Loans", value: activeCount?.cnt || "0", icon: BookCopy, color: "text-amber-600" },
    { label: "Overdue", value: overdueCount?.cnt || "0", icon: AlertTriangle, color: "text-red-600" },
    { label: "Total Fines", value: `₦${Number(fineTotal?.sum || 0).toFixed(2)}`, icon: DollarSign, color: "text-orange-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of the LAUTECH Library Management System</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
