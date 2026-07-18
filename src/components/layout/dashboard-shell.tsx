"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Navbar } from "./navbar"

interface DashboardShellProps {
  userRole: string
  userName: string
  userEmail: string
  children: React.ReactNode
}

export function DashboardShell({
  userRole,
  userName,
  userEmail,
  children,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar
          userName={userName}
          userRole={userRole}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
