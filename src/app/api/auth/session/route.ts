import { NextResponse } from "next/server"
import { z } from "zod"

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/config"
import { DynamicTokenError } from "@/lib/auth/dynamic"
import { identify, ProviderUnavailableError } from "@/lib/auth/identity"
import { isSameOrigin, isSecureRequest } from "@/lib/auth/request"
import { signSession } from "@/lib/auth/token"
import { readOnboarding } from "@/lib/onboarding/profile"

const body = z.object({
  provider: z.enum(["sandworm", "wallet"]).default("wallet"),
  token: z.string().min(1).max(8000),
})

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } })

// Turns a sign-in done in the browser, with whichever provider, into a session on our side. The browser hands over the token the
// provider gave it; it is checked here and never kept, and what is kept is our own cookie.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("This request didn't come from the app", 403)

  const parsed = body.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) return fail("The sign-in is missing something", 400)

  try {
    const userId = await identify(parsed.data.provider, parsed.data.token)
    // Whether this account has been through the first run, so the browser knows where to send them
    const { done } = await readOnboarding(userId)
    const response = NextResponse.json({ ok: true, onboarded: done }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(SESSION_COOKIE, await signSession(userId), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    })
    return response
  } catch (error) {
    if (error instanceof ProviderUnavailableError) return fail(error.message, 503)
    return fail(error instanceof DynamicTokenError ? error.message : "We couldn't sign you in", 401)
  }
}
