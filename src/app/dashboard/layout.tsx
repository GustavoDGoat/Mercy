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
      <div style={{ padding: "4rem 2rem", fontFamily: "monospace", maxWidth: 600, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Database Error</h1>
        <p style={{ color: "#ef4444", padding: "1rem", background: "#fef2f2", borderRadius: "0.5rem" }}>{dbError}</p>
        <p style={{ color: "#666", marginTop: "1rem" }}>Check Vercel environment variables and Supabase connection status.</p>
      </div>
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
