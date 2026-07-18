import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { validateAndClearSession } from "./session"
import db from "@/lib/db"
import { ThemeProvider } from "@/hooks/use-theme"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) {
    await validateAndClearSession()
    redirect("/login")
  }

  const user = db.users[session.userId]
  if (!user) {
    await validateAndClearSession()
    redirect("/login")
  }

  return (
    <ThemeProvider>
      <DashboardShell
        userRole={user.role}
        userName={`${user.firstName} ${user.lastName}`}
        userEmail={user.email}
      >
        {children}
      </DashboardShell>
    </ThemeProvider>
  )
}
