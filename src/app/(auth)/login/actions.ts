"use server"

import { cookies } from "next/headers"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { sql, querySingle } from "@/lib/db"
import { createAuditEntry } from "@/lib/audit"
import type { TokenPayload } from "@/lib/auth"

const JWT_SECRET = process.env.JWT_SECRET || "lautech-slms-jwt-secret-key-2024"

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
}

export async function login(email: string, password: string) {
  const row = await querySingle<Record<string, unknown>>`
    SELECT id, email, password_hash, fingerprint_template, fingerprint_platform
    FROM users WHERE email = ${email}
  `
  if (!row) return { error: "Invalid email or password" }

  const valid = await bcrypt.compare(password, row.password_hash as string)
  if (!valid) return { error: "Invalid email or password" }

  return {
    userId: row.id as string,
    hasFingerprint: !!(row.fingerprint_template),
    fingerprintTemplate: (row.fingerprint_template as string) || null,
    fingerprintPlatform: (row.fingerprint_platform as string) || null,
  }
}

export async function verifyMfa(userId: string) {
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
