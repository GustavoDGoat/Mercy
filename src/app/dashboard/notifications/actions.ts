"use server"

import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth"
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/notifications"

export async function fetchNotifications(limit?: number) {
  const session = await requireAuth()
  return getNotifications(session.userId, limit)
}

export async function fetchUnreadCount() {
  const session = await requireAuth()
  return getUnreadCount(session.userId)
}

export async function readNotification(id: string) {
  await requireAuth()
  await markAsRead(id)
  revalidatePath("/dashboard")
}

export async function readAllNotifications() {
  const session = await requireAuth()
  await markAllAsRead(session.userId)
  revalidatePath("/dashboard")
}
