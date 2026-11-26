import { type NextRequest, NextResponse } from "next/server"

import { ONBOARDING_COOKIES, ONBOARDING_PATH } from "@/constants/onboarding"
import { authRequired, DEFAULT_AFTER_SIGN_IN, SESSION_COOKIE, SIGN_IN_PATH } from "@/lib/auth/config"
import { readSession } from "@/lib/auth/token"
import { onboardedMarker } from "@/lib/onboarding/profile-marker"

const SHARE_PATH = "/share/"

const safeNext = (next: string | null) => (next?.startsWith("/") && !next.startsWith("//") ? next : undefined)

// The way into the app, in this order, for every page but the sign-in page:
//   not signed in            -> the sign-in page, remembering where they were going
//   signed in, first time    -> the first run (the stepper), before anything else
//   signed in, been through  -> where they were going; the sign-in page has nothing for them
// Who signed in, and with which provider, makes no difference here: it is our own session that is read.
export async function middleware(request: NextRequest) {
  // On by default. Only switched off to work on the app without a wallet.
  if (!authRequired()) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  if (pathname.startsWith(SHARE_PATH)) return NextResponse.next()
  const userId = await readSession(request.cookies.get(SESSION_COOKIE)?.value).catch(() => undefined)
  const onSignIn = pathname === SIGN_IN_PATH

  if (!userId) {
    if (onSignIn) return NextResponse.next()
    const url = new URL(SIGN_IN_PATH, request.url)
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(url)
  }

  const onboarded = request.cookies.get(ONBOARDING_COOKIES.done)?.value === onboardedMarker(userId)

  if (onSignIn) {
    const next = safeNext(request.nextUrl.searchParams.get("next"))
    return NextResponse.redirect(new URL(onboarded ? (next ?? DEFAULT_AFTER_SIGN_IN) : ONBOARDING_PATH, request.url))
  }

  if (!onboarded && pathname !== ONBOARDING_PATH) return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url))

  return NextResponse.next()
}

export const config = { matcher: ["/((?!api|_next|img|fonts|.*\\..*).*)"] }
