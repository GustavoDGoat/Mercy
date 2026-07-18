import { createHash } from "crypto"
import type { AuditAction, AuditEntry } from "@/types"
import db from "./db"

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex")
}

export function buildAuditHash(entry: Omit<AuditEntry, "hash">): string {
  const data = `${entry.id}|${entry.userId}|${entry.action}|${entry.details}|${entry.timestamp}|${entry.previousHash}`
  return sha256(data)
}

export function createAuditEntry(
  userId: string,
  action: AuditAction,
  details: string
): AuditEntry {
  const previousHash =
    db.auditLog.length > 0
      ? db.auditLog[db.auditLog.length - 1].hash
      : "0".repeat(64)

  const entry: Omit<AuditEntry, "hash"> = {
    id: crypto.randomUUID(),
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    previousHash,
  }

  const hash = buildAuditHash(entry)
  const fullEntry: AuditEntry = { ...entry, hash }
  db.auditLog.push(fullEntry)
  return fullEntry
}

export function getAuditLog(limit: number = 100): AuditEntry[] {
  return db.auditLog.slice(-limit).reverse()
}

export function getAuditLogByUser(userId: string): AuditEntry[] {
  return db.auditLog
    .filter((e) => e.userId === userId)
    .reverse()
}

export function verifyAuditIntegrity(): {
  valid: boolean
  tamperedIndex: number
} {
  for (let i = 1; i < db.auditLog.length; i++) {
    const entry = db.auditLog[i]
    if (entry.previousHash !== db.auditLog[i - 1].hash) {
      return { valid: false, tamperedIndex: i }
    }
    const expectedHash = buildAuditHash({
      id: entry.id,
      userId: entry.userId,
      action: entry.action,
      details: entry.details,
      timestamp: entry.timestamp,
      previousHash: entry.previousHash,
    })
    if (entry.hash !== expectedHash) {
      return { valid: false, tamperedIndex: i }
    }
  }
  return { valid: true, tamperedIndex: -1 }
}
