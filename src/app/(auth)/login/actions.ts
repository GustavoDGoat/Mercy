"use server"

import crypto from "crypto"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { sql, querySingle } from "@/lib/db"
import { createAuditEntry } from "@/lib/audit"
import { decryptTemplate } from "@/lib/encryption"
import type { TokenPayload } from "@/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET || "lautech-slms-jwt-secret-key-2024"
const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || process.env.JWT_SECRET || "lautech-slms-jwt-secret-key-2024"

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
}

function validateVerificationToken(
  userId: string,
  timestamp: string,
  token: string
): boolean {
  if (!VERIFICATION_SECRET) return false

  const ts = new Date(timestamp)
  if (isNaN(ts.getTime())) return false

  const diffSeconds = Math.abs((Date.now() - ts.getTime()) / 1000)
  if (diffSeconds > 60) return false

  const payload = `${userId}|${timestamp}|match`
  const expected = crypto
    .createHmac("sha256", VERIFICATION_SECRET)
    .update(payload)
    .digest("base64")

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(token)
  )
}

export async function login(email: string, password: string) {
  const row = await querySingle<Record<string, unknown>>`
    SELECT id, email, password_hash,
           fingerprint_template_encrypted, fingerprint_platform
    FROM users WHERE email = ${email}
  `
  if (!row) return { error: "Invalid email or password" }

  const valid = await bcrypt.compare(password, row.password_hash as string)
  if (!valid) return { error: "Invalid email or password" }

  let template: string | null = null
  const encrypted = row.fingerprint_template_encrypted as string | null
  if (encrypted) {
    try {
      template = decryptTemplate(encrypted)
    } catch {
      template = null
    }
  }

  return {
    userId: row.id as string,
    hasFingerprint: !!(encrypted),
    fingerprintTemplate: template,
    fingerprintPlatform: (row.fingerprint_platform as string) || null,
  }
}

export async function verifyMfa(
  userId: string,
  verificationToken?: string,
  timestamp?: string
) {
  if (verificationToken && timestamp) {
    const valid = validateVerificationToken(userId, timestamp, verificationToken)
    if (!valid) return { error: "Fingerprint verification failed — invalid or expired token." }
  }

  const row = await querySingle<Record<string, unknown>>`
    SELECT id, email, role FROM users WHERE id = ${userId}
  `
  if (!row) return { error: "User not found" }

  const cookieStore = await cookies()
  const token = signToken({
    userId: row.id as string,
    role: row.role as string,
    email: row.email as string,
  })

  cookieStore.set("slms-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  try {
    await createAuditEntry(row.id as string, "login", `User ${row.email} logged in with MFA`)
  } catch (e) {
    console.error("[MFA] Audit entry failed (non-blocking):", e)
  }

  return { success: true }
}
