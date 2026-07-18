import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  switch (session.role) {
    case "admin":
      redirect("/dashboard/admin")
    case "librarian":
      redirect("/dashboard/librarian")
    case "student":
      redirect("/dashboard/student")
    default:
      redirect("/login")
  }
}
