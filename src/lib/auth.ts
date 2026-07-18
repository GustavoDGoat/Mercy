import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "lautech-slms-jwt-secret-key-2024"
const JWT_EXPIRY = "24h"

export interface TokenPayload {
  userId: string
  role: string
  email: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("slms-token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function requireAuth(): Promise<TokenPayload> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  return session
}

export async function requireRole(
  ...roles: string[]
): Promise<TokenPayload> {
  const session = await requireAuth()
  if (!roles.includes(session.role)) throw new Error("Forbidden")
  return session
}
