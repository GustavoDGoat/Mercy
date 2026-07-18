import type { Notification, NotificationType } from "@/types"
import db from "./db"

export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string
): Notification {
  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    message,
    relatedId,
    read: false,
    createdAt: new Date().toISOString(),
  }
  db.notifications[notification.id] = notification
  return notification
}

export function getUnreadCount(userId: string): number {
  return Object.values(db.notifications).filter(
    (n) => n.userId === userId && !n.read
  ).length
}

export function getNotifications(
  userId: string,
  limit?: number
): Notification[] {
  const all = Object.values(db.notifications)
    .filter((n) => n.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  return limit ? all.slice(0, limit) : all
}

export function markAsRead(notificationId: string): void {
  if (db.notifications[notificationId]) {
    db.notifications[notificationId].read = true
  }
}

export function markAllAsRead(userId: string): void {
  Object.values(db.notifications).forEach((n) => {
    if (n.userId === userId) n.read = true
  })
}
