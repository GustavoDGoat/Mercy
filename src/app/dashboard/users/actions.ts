"use server"

import { revalidatePath } from "next/cache"
import db from "@/lib/db"
import { requireRole } from "@/lib/auth"
import { createAuditEntry } from "@/lib/audit"

export async function getUsers() {
  await requireRole("admin")
  return Object.values(db.users).map((user) => {
    const member = user.memberId ? db.members[user.memberId] : null
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      memberId: user.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  })
}

export async function deleteUser(userId: string) {
  const session = await requireRole("admin")
  if (session.userId === userId) return { error: "Cannot delete your own account" }

  const user = db.users[userId]
  if (!user) return { error: "User not found" }

  const activeLoans = Object.values(db.transactions).filter(
    (t) => t.issuedBy === userId && t.status === "active"
  )
  if (activeLoans.length > 0) return { error: "Cannot delete a user with active transactions" }

  delete db.users[userId]
  if (user.memberId) delete db.members[user.memberId]
  createAuditEntry(session.userId, "delete_member", `Deleted user: ${user.email}`)
  revalidatePath("/dashboard/users")
  return { success: true }
}
