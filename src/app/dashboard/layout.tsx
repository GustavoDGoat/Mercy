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

  let user: Record<string, unknown> | null = null
  let dbError: string | null = null

  try {
    user = await querySingle<Record<string, unknown>>`
      SELECT first_name, last_name, email, role FROM users WHERE id = ${session.userId}
    `
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string }
    console.error("[Dashboard] Postgres query failed:", err.message || err)
    dbError = err.message || "Database connection failed"
  }

  if (dbError) {
    return (
      <html>
        <body>
          <div style={{ padding: "2rem", fontFamily: "monospace" }}>
            <h1>Database Error</h1>
            <p>{dbError}</p>
            <p style={{ color: "#666" }}>Check Vercel environment variables and Supabase connection.</p>
          </div>
        </body>
      </html>
    )
  }

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
