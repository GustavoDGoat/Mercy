import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import db from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, BookCopy, AlertTriangle } from "lucide-react"

export default async function LibrarianDashboardPage() {
  const session = await getSession()
  if (!session || session.role === "student") redirect("/login")

  const books = Object.values(db.books)
  const members = Object.values(db.members)
  const transactions = Object.values(db.transactions)
  const activeLoans = transactions.filter((t) => t.status === "active")
  const overdueLoans = activeLoans.filter((t) => new Date(t.dueDate) < new Date())
  const availableBooks = books.reduce((sum, b) => sum + b.availableCopies, 0)

  const stats = [
    { label: "Total Books", value: books.length, icon: BookOpen, color: "text-blue-600" },
    { label: "Available Books", value: availableBooks, icon: BookCopy, color: "text-green-600" },
    { label: "Registered Members", value: members.length, icon: Users, color: "text-purple-600" },
    { label: "Active Loans", value: activeLoans.length, icon: BookCopy, color: "text-amber-600" },
    { label: "Overdue Items", value: overdueLoans.length, icon: AlertTriangle, color: "text-red-600" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Librarian Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the library management panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
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
