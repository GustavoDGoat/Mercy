"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BookCopy,
  FileText,
  Shield,
  UserCog,
  Radio,
  LogOut,
  ChevronLeft,
  Menu,
  Library,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "./theme-toggle"
import { logout } from "@/app/dashboard/actions"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: string[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ["admin", "librarian", "student"],
  },
  {
    label: "Book Management",
    href: "/dashboard/books",
    icon: <BookOpen className="w-5 h-5" />,
    roles: ["admin", "librarian"],
  },
  {
    label: "Member Management",
    href: "/dashboard/members",
    icon: <Users className="w-5 h-5" />,
    roles: ["admin", "librarian"],
  },
  {
    label: "Circulation",
    href: "/dashboard/circulation",
    icon: <BookCopy className="w-5 h-5" />,
    roles: ["admin", "librarian"],
  },
  {
    label: "User Management",
    href: "/dashboard/users",
    icon: <UserCog className="w-5 h-5" />,
    roles: ["admin"],
  },
  {
    label: "RFID Gate Monitor",
    href: "/dashboard/rfid",
    icon: <Radio className="w-5 h-5" />,
    roles: ["admin", "librarian"],
  },
  {
    label: "Audit Trail",
    href: "/dashboard/audit",
    icon: <FileText className="w-5 h-5" />,
    roles: ["admin", "librarian"],
  },
]

interface SidebarProps {
  userRole: string
  userName: string
  userEmail: string
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar-bg text-sidebar-fg">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">LAUTECH</p>
              <p className="text-[10px] text-sidebar-fg/60 truncate">Library System</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-fg hover:text-accent hover:bg-white/10 shrink-0 hidden lg:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-accent/20 text-accent font-medium"
                    : "text-sidebar-fg/70 hover:bg-white/10 hover:text-sidebar-fg"
                } ${collapsed ? "justify-center px-2" : ""}`}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-white/10 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-sidebar-fg truncate">{userName}</p>
            <p className="text-[10px] text-sidebar-fg/50 truncate">{userEmail}</p>
          </div>
        )}
        <div
          className={`flex items-center gap-2 ${collapsed ? "justify-center flex-col" : ""}`}
        >
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-sidebar-fg hover:text-destructive hover:bg-white/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block transition-all duration-300 shrink-0" style={{ width: collapsed ? 72 : 256 }}>
        {sidebarContent}
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 shadow-2xl animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
