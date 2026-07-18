"use server"

import { cookies } from "next/headers"
import db from "@/lib/db"
import { hashPassword, verifyPassword, signToken } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function login(email: string, password: string) {
  const user = Object.values(db.users).find((u) => u.email === email)
  if (!user) return { error: "Invalid email or password" }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return { error: "Invalid email or password" }

  return { userId: user.id }
}

export async function verifyMfa(userId: string) {
  const user = db.users[userId]
  if (!user) return { error: "User not found" }

  const cookieStore = await cookies()
  const token = signToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  })

  cookieStore.set("slms-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  createAuditEntry(user.id, "login", `User ${user.email} logged in with MFA`)

  return { success: true }
}

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "student" | "librarian" | "admin"
) {
  const existing = Object.values(db.users).find((u) => u.email === email)
  if (existing) return { error: "A user with this email already exists" }

  const id = crypto.randomUUID()
  const passwordHash = await hashPassword(password)
  const fingerprintHash = await hashPassword(`fingerprint:${id}`)

  const user = {
    id,
    email,
    passwordHash,
    firstName,
    lastName,
    role,
    fingerprintHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.users[id] = user
  createAuditEntry(id, "update_member", `New user registered: ${email} as ${role}`)

  return { success: true, userId: id }
}
