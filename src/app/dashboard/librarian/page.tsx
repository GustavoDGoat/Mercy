import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql, querySingle } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, BookCopy, AlertTriangle } from "lucide-react"

export default async function LibrarianDashboardPage() {
  const session = await getSession()
  if (!session || session.role === "student") redirect("/login")

  let stats: { label: string; value: string; icon: React.ReactNode; color: string }[] = []
  let error: string | null = null

  try {
    const [bookStats, memberCount, activeCount, overdueCount] = await Promise.all([
      sql<{ total: string; avail: string }>`
        SELECT COUNT(*)::text as total, COALESCE(SUM(available_copies), 0)::text as avail FROM books
      `,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM members`,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE status = 'active'`,
      querySingle<{ cnt: string }>`SELECT COUNT(*)::text as cnt FROM transactions WHERE status = 'active' AND due_date < NOW()`,
    ])

    const books = bookStats[0]
    stats = [
      { label: "Total Books", value: books.total, icon: <BookOpen className="w-4 h-4" />, color: "text-blue-600" },
      { label: "Available Books", value: books.avail, icon: <BookCopy className="w-4 h-4" />, color: "text-green-600" },
      { label: "Registered Members", value: memberCount?.cnt || "0", icon: <Users className="w-4 h-4" />, color: "text-purple-600" },
      { label: "Active Loans", value: activeCount?.cnt || "0", icon: <BookCopy className="w-4 h-4" />, color: "text-amber-600" },
      { label: "Overdue Items", value: overdueCount?.cnt || "0", icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600" },
    ]
  } catch (e: unknown) {
    error = (e as Error).message
    console.error("[Librarian] Query failed:", error)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Librarian Dashboard</h1>
        <p className="text-muted-foreground">Welcome to the library management panel</p>
      </div>
      {error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Query Error</p>
            <p className="text-sm text-muted-foreground mt-1 font-mono">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <span className={stat.color}>{stat.icon}</span>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
