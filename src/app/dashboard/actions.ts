"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function logout() {
  const session = await getSession()
  if (session) {
    await createAuditEntry(session.userId, "logout", `User ${session.email} logged out`)
  }

  const cookieStore = await cookies()
  cookieStore.delete("slms-token")
}
