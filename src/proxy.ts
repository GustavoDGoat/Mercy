import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = [
  "/login",
  "/api/auth/login",
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  const token = request.cookies.get("slms-token")?.value

  if (isPublic && !token) return NextResponse.next()
  if (isPublic && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|next.svg|vercel.svg).*)",
  ],
}
