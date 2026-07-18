"use server"

import { cookies } from "next/headers"
import { getSession } from "@/lib/auth"

export async function validateAndClearSession(): Promise<boolean> {
  const session = await getSession()
  if (!session) {
    const cookieStore = await cookies()
    cookieStore.delete("slms-token")
    return false
  }
  return true
}
