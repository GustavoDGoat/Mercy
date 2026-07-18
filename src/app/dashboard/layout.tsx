import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { validateAndClearSession } from "./session"
import { querySingle } from "@/lib/db"
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

  const user = await querySingle<Record<string, unknown>>`
    SELECT first_name, last_name, email, role FROM users WHERE id = ${session.userId}
  `
  if (!user) {
    await validateAndClearSession()
    redirect("/login")
  }

  return (
    <ThemeProvider>
      <DashboardShell
        userRole={user.role as string}
        userName={`${user.first_name} ${user.last_name}`}
        userEmail={user.email as string}
      >
        {children}
      </DashboardShell>
    </ThemeProvider>
  )
}
