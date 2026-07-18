"use server"

import { requireAuth } from "@/lib/auth"
import { getAuditLog, verifyAuditIntegrity } from "@/lib/audit"

export async function fetchAuditLog() {
  await requireAuth()
  return getAuditLog(200)
}

export async function fetchAuditIntegrity() {
  await requireAuth()
  return verifyAuditIntegrity()
}
