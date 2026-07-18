"use server"

import { revalidatePath } from "next/cache"
import type { Member } from "@/types"
import db from "@/lib/db"
import { requireAuth, requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getMembers(search?: string, status?: string) {
  await requireRole("admin", "librarian")

  let members = Object.values(db.members)

  if (search) {
    const q = search.toLowerCase()
    members = members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.matricNumber.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
    )
  }

  if (status && status !== "all") {
    members = members.filter((m) => m.status === status)
  }

  return members.sort((a, b) => a.lastName.localeCompare(b.lastName))
}

export async function getMember(memberId: string) {
  await requireRole("admin", "librarian")
  return db.members[memberId] || null
}

export async function createMember(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
  matricNumber: string
  department: string
  faculty: string
  level: string
}) {
  const session = await requireRole("admin", "librarian")

  const existing = Object.values(db.members).find(
    (m) => m.email === data.email || m.matricNumber === data.matricNumber
  )
  if (existing) return { error: "A member with this email or matric number already exists" }

  const id = `SE-${Date.now().toString(36).toUpperCase()}`

  const member: Member = {
    id,
    ...data,
    maxBorrowLimit: 4,
    status: "active",
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.members[id] = member
  createAuditEntry(session.userId, "register_member", `Registered member: ${member.firstName} ${member.lastName}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return member
}

export async function updateMember(
  memberId: string,
  data: Partial<{
    firstName: string
    lastName: string
    email: string
    phone: string
    matricNumber: string
    department: string
    faculty: string
    level: string
    status: "active" | "suspended" | "inactive"
    maxBorrowLimit: number
  }>
) {
  const session = await requireRole("admin", "librarian")

  const member = db.members[memberId]
  if (!member) return { error: "Member not found" }

  Object.assign(member, data, { updatedAt: new Date().toISOString() })
  createAuditEntry(session.userId, "update_member", `Updated member: ${member.firstName} ${member.lastName}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return member
}

export async function deleteMember(memberId: string) {
  const session = await requireRole("admin", "librarian")

  const member = db.members[memberId]
  if (!member) return { error: "Member not found" }

  const activeLoans = Object.values(db.transactions).filter(
    (t) => t.memberId === memberId && t.status === "active"
  )
  if (activeLoans.length > 0) return { error: "Cannot delete a member with active loans" }

  delete db.members[memberId]
  createAuditEntry(session.userId, "delete_member", `Deleted member: ${member.firstName} ${member.lastName}`)
  revalidatePath("/dashboard/members")
  revalidatePath("/dashboard")
  return { success: true }
}
