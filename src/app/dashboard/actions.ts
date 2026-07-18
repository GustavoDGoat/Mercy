"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function logout() {
  const session = await getSession()
  if (session) {
    try {
      await createAuditEntry(session.userId, "logout", `User ${session.email} logged out`)
    } catch (e) {
      console.error("[Logout] Audit entry failed (non-blocking):", e)
    }
  }

  const cookieStore = await cookies()
  cookieStore.delete("slms-token")
}
