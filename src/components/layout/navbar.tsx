"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Menu, Bell, CheckCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "./theme-toggle"
import { fetchNotifications, fetchUnreadCount, readNotification, readAllNotifications } from "@/app/dashboard/notifications/actions"
import type { Notification } from "@/types"
import { format } from "date-fns"

interface NavbarProps {
  userName: string
  userRole: string
  onMenuClick: () => void
}

const typeLabels: Record<string, { color: string; label: string }> = {
  borrow_approved: { color: "text-green-600", label: "Approved" },
  borrow_rejected: { color: "text-red-600", label: "Rejected" },
  due_soon: { color: "text-amber-600", label: "Due Soon" },
  overdue: { color: "text-red-600", label: "Overdue" },
}

export function Navbar({ userName, userRole, onMenuClick }: NavbarProps) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function load() {
      const [count, items] = await Promise.all([
        fetchUnreadCount(),
        fetchNotifications(5),
      ])
      setUnread(count)
      setNotifications(items)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleOpen() {
    setOpen(!open)
    if (!open) {
      setLoading(true)
      const [count, items] = await Promise.all([
        fetchUnreadCount(),
        fetchNotifications(5),
      ])
      setUnread(count)
      setNotifications(items)
      setLoading(false)
    }
  }

  async function handleClickNotification(notif: Notification) {
    if (!notif.read) {
      await readNotification(notif.id)
      setUnread((prev) => Math.max(0, prev - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      )
    }
    setOpen(false)
  }

  async function handleMarkAllRead() {
    await readAllNotifications()
    setUnread(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-sm font-semibold text-foreground">Welcome, {userName}</p>
          <p className="text-xs text-muted-foreground capitalize">{userRole} Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <Button variant="ghost" size="icon" className="relative" onClick={handleOpen}>
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground leading-none px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-auto py-1 text-xs">
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[360px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleClickNotification(notif)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                        !notif.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            {typeLabels[notif.type] && (
                              <span className={`text-[10px] font-medium ${typeLabels[notif.type].color} shrink-0`}>
                                {typeLabels[notif.type].label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(notif.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </ScrollArea>
              <div className="border-t border-border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setOpen(false)
                    router.push("/dashboard/notifications")
                  }}
                >
                  View All Notifications
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
