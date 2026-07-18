"use server"

import { revalidatePath } from "next/cache"
import { sql, querySingle, execute } from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"
import type { Member } from "@/types"

function mapMember(r: Record<string, unknown>): Member {
  return {
    id: r.id as string,
    userId: r.user_id as string | undefined,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: r.email as string,
    phone: (r.phone as string) || "",
    matricNumber: r.matric_number as string,
    department: (r.department as string) || "",
    faculty: (r.faculty as string) || "",
    level: (r.level as string) || "",
    maxBorrowLimit: (r.max_borrow_limit as number) || 4,
    status: (r.status as string) || "active",
    registeredAt: r.registered_at as string,
    updatedAt: r.updated_at as string,
  } as Member
}

export async function getMembers(search?: string, status?: string) {
  await requireRole("admin", "librarian")

  let where = ""
  const params: unknown[] = []

  if (search) {
    const q = `%${search.toLowerCase()}%`
    where += ` AND (LOWER(first_name) LIKE $${params.length + 1} OR LOWER(last_name) LIKE $${params.length + 2} OR LOWER(matric_number) LIKE $${params.length + 3} OR LOWER(email) LIKE $${params.length + 4} OR LOWER(department) LIKE $${params.length + 5})`
    params.push(q, q, q, q, q)
  }
  if (status && status !== "all") {
    where += ` AND status = $${params.length + 1}`
    params.push(status)
  }

  const query = `SELECT * FROM members WHERE 1=1 ${where} ORDER BY last_name ASC`
  const rows = await sql<Record<string, unknown>>(query, ...params)

  return rows.map(mapMember)
}

export async function getMember(memberId: string) {
  await requireRole("admin", "librarian")
  const row = await querySingle<Record<string, unknown>>`SELECT * FROM members WHERE id = ${memberId}`
  return row ? mapMember(row) : null
}

export async function createMember(data: {
  firstName: string; lastName: string; email: string
  phone: string; matricNumber: string
  department: string; faculty: string; level: string
}) {
  const session = await requireRole("admin", "librarian")

  const existing = await querySingle`
    SELECT id FROM members WHERE email = ${data.email} OR matric_number = ${data.matricNumber}
  `
  if (existing) return { error: "A member with this email or matric number already exists" }

  const id = `SE-${Date.now().toString(36).toUpperCase()}`
  const now = new Date().toISOString()

  await execute`
    INSERT INTO members (id, first_name, last_name, email, phone, matric_number, department, faculty, level, max_borrow_limit, status, registered_at, updated_at)
    VALUES (${id}, ${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone}, ${data.matricNumber}, ${data.department}, ${data.faculty}, ${data.level}, 4, 'active', ${now}, ${now})
  `

  await createAuditEntry(session.userId, "register_member", `Registered member: ${data.firstName} ${data.lastName}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return mapMember({
    id, first_name: data.firstName, last_name: data.lastName, email: data.email,
    phone: data.phone, matric_number: data.matricNumber, department: data.department,
    faculty: data.faculty, level: data.level, max_borrow_limit: 4, status: "active",
    registered_at: now, updated_at: now,
  })
}

export async function updateMember(memberId: string, data: Record<string, unknown>) {
  const session = await requireRole("admin", "librarian")

  const member = await querySingle<Record<string, unknown>>`SELECT * FROM members WHERE id = ${memberId}`
  if (!member) return { error: "Member not found" }

  const fieldMap: Record<string, string> = {
    firstName: "first_name", lastName: "last_name", email: "email",
    phone: "phone", matricNumber: "matric_number", department: "department",
    faculty: "faculty", level: "level", status: "status",
    maxBorrowLimit: "max_borrow_limit",
  }

  const updates: string[] = []
  const vals: unknown[] = []
  let idx = 0

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      updates.push(`${col} = $${++idx}`)
      vals.push(data[key])
    }
  }
  if (updates.length === 0) return mapMember(member)

  updates.push(`updated_at = $${++idx}`)
  vals.push(new Date().toISOString())
  vals.push(memberId)

  const updateQuery = `UPDATE members SET ${updates.join(", ")} WHERE id = $${++idx}`
  await execute(updateQuery, ...vals)
  await createAuditEntry(session.userId, "update_member", `Updated member: ${data.firstName || member.first_name} ${data.lastName || member.last_name}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return mapMember({ ...member, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [fieldMap[k] || k, v])) })
}

export async function deleteMember(memberId: string) {
  const session = await requireRole("admin", "librarian")

  const member = await querySingle<Record<string, unknown>>`SELECT * FROM members WHERE id = ${memberId}`
  if (!member) return { error: "Member not found" }

  const activeLoans = await querySingle`
    SELECT id FROM transactions WHERE member_id = ${memberId} AND status = 'active'
  `
  if (activeLoans) return { error: "Cannot delete a member with active loans" }

  await execute`DELETE FROM members WHERE id = ${memberId}`
  await createAuditEntry(session.userId, "delete_member", `Deleted member: ${member.first_name} ${member.last_name}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return { success: true }
}
