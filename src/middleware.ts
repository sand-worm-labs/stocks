import { type NextRequest, NextResponse } from "next/server"

import { DEFAULT_AFTER_SIGN_IN, PROTECTED_PATHS, SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/config"
import { readSession } from "@/lib/auth/token"

const isProtected = (pathname: string) =>
  pathname === "/" || PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

// The pages that hold a person's portfolios need a wallet signed in. Without one they are sent to sign in and brought
// back to where they were going; signed in already, they have no reason to see the sign-in page.
export async function middleware(request: NextRequest) {
  // Off until wallet sign-in is switched on, so the app stays open to whoever runs it
  if (process.env.AUTH_REQUIRED !== "true") return NextResponse.next()

  const { pathname, search } = request.nextUrl
  const wallet = await readSession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => undefined)

  if (pathname === SIGN_IN_PATH && wallet) {
    const next = request.nextUrl.searchParams.get("next")
    const target = next?.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AFTER_SIGN_IN
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (isProtected(pathname) && !wallet) {
    const url = new URL(SIGN_IN_PATH, request.url)
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = { matcher: ["/((?!api|_next|img|fonts|.*\\..*).*)"] }
