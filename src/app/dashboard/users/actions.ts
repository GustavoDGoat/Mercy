"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { sql, querySingle, execute } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getUsers() {
  await requireRole("admin")

  const rows = await sql<Record<string, unknown>>`
    SELECT u.*, m.first_name as m_first, m.last_name as m_last
    FROM users u
    LEFT JOIN members m ON u.member_id = m.id
    ORDER BY u.role, u.last_name
  `

  return rows.map((r) => ({
    id: r.id as string, email: r.email as string,
    firstName: r.first_name as string, lastName: r.last_name as string,
    role: r.role as string, memberId: r.member_id as string | undefined,
    memberName: r.m_first ? `${r.m_first} ${r.m_last}` : null,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  }))
}

export async function deleteUser(userId: string) {
  const session = await requireRole("admin")
  if (session.userId === userId) return { error: "Cannot delete your own account" }

  const user = await querySingle<Record<string, unknown>>`SELECT * FROM users WHERE id = ${userId}`
  if (!user) return { error: "User not found" }

  const activeLoans = await querySingle`SELECT id FROM transactions WHERE issued_by = ${userId} AND status = 'active'`
  if (activeLoans) return { error: "Cannot delete a user with active transactions" }

  await execute`DELETE FROM notifications WHERE user_id = ${userId}`
  if (user.member_id) await execute`DELETE FROM members WHERE id = ${user.member_id}`
  await execute`DELETE FROM users WHERE id = ${userId}`

  await createAuditEntry(session.userId, "delete_member", `Deleted user: ${user.email}`)
  revalidatePath("/dashboard/users")
  return { success: true }
}

export async function createStudentAccount(data: {
  email: string; password: string; firstName: string; lastName: string
  phone?: string; matricNumber: string; department?: string
  faculty?: string; level?: string
}) {
  const session = await requireRole("admin")

  const existingUser = await querySingle`SELECT id FROM users WHERE email = ${data.email}`
  if (existingUser) return { error: "A user with this email already exists" }

  const existingMember = await querySingle`SELECT id FROM members WHERE matric_number = ${data.matricNumber}`
  if (existingMember) return { error: "A member with this matric number already exists" }

  const userId = crypto.randomUUID()
  const memberId = `SE-${Date.now().toString(36).toUpperCase()}`
  const passwordHash = await bcrypt.hash(data.password, 12)
  const fingerprintHash = await bcrypt.hash(`fingerprint:${userId}`, 12)
  const now = new Date().toISOString()

  await execute`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, member_id, fingerprint_hash, created_at, updated_at)
    VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'student', ${memberId}, ${fingerprintHash}, ${now}, ${now})
  `

  await execute`
    INSERT INTO members (id, user_id, first_name, last_name, email, phone, matric_number, department, faculty, level, max_borrow_limit, status, registered_at, updated_at)
    VALUES (${memberId}, ${userId}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone || null}, ${data.matricNumber}, ${data.department || null}, ${data.faculty || null}, ${data.level || "100L"}, 4, 'active', ${now}, ${now})
  `

  await createAuditEntry(session.userId, "register_member", `Created student account: ${data.email} (Matric: ${data.matricNumber})`)
  revalidatePath("/dashboard/users")
  revalidatePath("/dashboard/members")
  return { success: true, email: data.email }
}

export async function createLibrarianAccount(data: {
  email: string; password: string; firstName: string; lastName: string
  phone?: string; matricNumber: string; department?: string
  faculty?: string; level?: string
}) {
  const session = await requireRole("admin")

  const existingUser = await querySingle`SELECT id FROM users WHERE email = ${data.email}`
  if (existingUser) return { error: "A user with this email already exists" }

  const existingMember = await querySingle`SELECT id FROM members WHERE matric_number = ${data.matricNumber}`
  if (existingMember) return { error: "A member with this matric number already exists" }

  const userId = crypto.randomUUID()
  const memberId = `LB-${Date.now().toString(36).toUpperCase()}`
  const passwordHash = await bcrypt.hash(data.password, 12)
  const fingerprintHash = await bcrypt.hash(`fingerprint:${userId}`, 12)
  const now = new Date().toISOString()

  await execute`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, member_id, fingerprint_hash, created_at, updated_at)
    VALUES (${userId}, ${data.email}, ${passwordHash}, ${data.firstName}, ${data.lastName}, 'librarian', ${memberId}, ${fingerprintHash}, ${now}, ${now})
  `

  await execute`
    INSERT INTO members (id, user_id, first_name, last_name, email, phone, matric_number, department, faculty, level, max_borrow_limit, status, registered_at, updated_at)
    VALUES (${memberId}, ${userId}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone || null}, ${data.matricNumber}, ${data.department || null}, ${data.faculty || null}, ${data.level || "STAFF"}, 10, 'active', ${now}, ${now})
  `

  await createAuditEntry(session.userId, "register_member", `Created librarian account: ${data.email}`)
  revalidatePath("/dashboard/users")
  revalidatePath("/dashboard/members")
  return { success: true, email: data.email }
}
