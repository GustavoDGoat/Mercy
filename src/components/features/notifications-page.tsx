"use client"

import { useEffect, useState } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchNotifications, readAllNotifications, readNotification } from "@/app/dashboard/notifications/actions"
import type { Notification } from "@/types"
import { format } from "date-fns"

const typeLabels: Record<string, { color: string; label: string }> = {
  borrow_approved: { color: "text-green-600", label: "Borrow Approved" },
  borrow_rejected: { color: "text-red-600", label: "Borrow Rejected" },
  due_soon: { color: "text-amber-600", label: "Due Soon" },
  overdue: { color: "text-red-600", label: "Overdue" },
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await fetchNotifications(100)
    setNotifications(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      await readNotification(notif.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
    }
  }

  async function handleMarkAll() {
    await readAllNotifications()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm">You&apos;ll see borrow approvals, rejections, and alerts here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                !notif.read
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {!notif.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{notif.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(notif.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {typeLabels[notif.type] && (
                  <span className={`text-xs font-medium ${typeLabels[notif.type].color} shrink-0 whitespace-nowrap`}>
                    {typeLabels[notif.type].label}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
