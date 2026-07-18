import type { Notification, NotificationType } from "@/types"
import { sql, execute, querySingle } from "./db"

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string
): Promise<Notification> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await execute`
    INSERT INTO notifications (id, user_id, type, title, message, related_id, read, created_at)
    VALUES (${id}, ${userId}, ${type}, ${title}, ${message}, ${relatedId || null}, false, ${now})
  `

  return {
    id, userId, type, title, message,
    relatedId, read: false, createdAt: now,
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const row = await querySingle<{ cnt: string }>`
    SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ${userId} AND read = false
  `
  return row ? parseInt(row.cnt) : 0
}

export async function getNotifications(
  userId: string,
  limit?: number
): Promise<Notification[]> {
  const limitClause = limit ? `LIMIT ${limit}` : ""
  const rows = await sql<Record<string, unknown>>(
    `SELECT id, user_id, type, title, message, related_id, read, created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    ${limitClause}`,
    userId
  )

  return rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as NotificationType,
    title: r.title as string,
    message: (r.message as string) || "",
    relatedId: r.related_id as string | undefined,
    read: (r.read as boolean) || false,
    createdAt: r.created_at as string,
  }))
}

export async function markAsRead(notificationId: string): Promise<void> {
  await execute`
    UPDATE notifications SET read = true WHERE id = ${notificationId}
  `
}

export async function markAllAsRead(userId: string): Promise<void> {
  await execute`
    UPDATE notifications SET read = true WHERE user_id = ${userId}
  `
}
