import { createHash } from "crypto"
import type { AuditAction, AuditEntry } from "@/types"
import { sql, execute, querySingle } from "./db"

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex")
}

export async function createAuditEntry(
  userId: string,
  action: AuditAction,
  details: string
): Promise<AuditEntry> {
  const lastRow = await querySingle<{ hash: string }>`
    SELECT hash FROM audit_log ORDER BY timestamp DESC LIMIT 1
  `
  const previousHash = lastRow?.hash || "0".repeat(64)

  const id = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  const data = `${id}|${userId}|${action}|${details}|${timestamp}|${previousHash}`
  const hash = sha256(data)

  await execute`
    INSERT INTO audit_log (id, user_id, action, details, timestamp, hash, previous_hash)
    VALUES (${id}, ${userId}, ${action}, ${details}, ${timestamp}, ${hash}, ${previousHash})
  `

  return { id, userId, action, details, timestamp, hash, previousHash }
}

export function getAuditLog(limit: number = 100): Promise<AuditEntry[]> {
  return getAuditLogInternal(limit)
}

export async function getAuditLogByUser(userId: string): Promise<AuditEntry[]> {
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM audit_log WHERE user_id = ${userId} ORDER BY timestamp DESC LIMIT 100
  `
  return rows.map(mapAuditRow)
}

async function getAuditLogInternal(limit: number = 100): Promise<AuditEntry[]> {
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ${limit}
  `
  return rows.map(mapAuditRow)
}

function mapAuditRow(r: Record<string, unknown>): AuditEntry {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    action: r.action as AuditAction,
    details: r.details as string,
    ipAddress: r.ip_address as string | undefined,
    timestamp: r.timestamp as string,
    hash: r.hash as string,
    previousHash: r.previous_hash as string,
  }
}

export async function verifyAuditIntegrity(): Promise<{ valid: boolean; tamperedIndex: number }> {
  const rows = await sql<Record<string, unknown>>`
    SELECT * FROM audit_log ORDER BY timestamp ASC
  `
  for (let i = 1; i < rows.length; i++) {
    const entry = rows[i]
    const prev = rows[i - 1]
    if (entry.previous_hash !== prev.hash) {
      return { valid: false, tamperedIndex: i }
    }
    const entryId = entry.id as string
    const entryUserId = entry.user_id as string
    const entryAction = entry.action as string
    const entryDetails = entry.details as string
    const entryTimestamp = entry.timestamp as string
    const entryPrevHash = entry.previous_hash as string
    const data = `${entryId}|${entryUserId}|${entryAction}|${entryDetails}|${entryTimestamp}|${entryPrevHash}`
    const expectedHash = sha256(data)
    if (entry.hash !== expectedHash) {
      return { valid: false, tamperedIndex: i }
    }
  }
  return { valid: true, tamperedIndex: -1 }
}
