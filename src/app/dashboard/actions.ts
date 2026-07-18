"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"
import db from "@/lib/db"

export async function logout() {
  const session = await getSession()
  if (session) {
    createAuditEntry(session.userId, "logout", `User ${session.email} logged out`)
  }

  const cookieStore = await cookies()
  cookieStore.delete("slms-token")
}
