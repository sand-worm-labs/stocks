import { NextResponse } from "next/server"
import { z } from "zod"

import { ensureAccount } from "@/lib/auth/account"
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/config"
import { DynamicTokenError } from "@/lib/auth/dynamic"
import { identify, ProviderUnavailableError } from "@/lib/auth/identity"
import { isSameOrigin, isSecureRequest } from "@/lib/auth/request"
import { SandwormAccountError } from "@/lib/auth/sandworm"
import { signSession } from "@/lib/auth/token"
import { readOnboarding } from "@/lib/onboarding/profile"

const body = z.object({ token: z.string().min(1).max(8000) })

class AccountError extends Error {}

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } })

// What went wrong, as an answer that is safe to show
function failure(error: unknown) {
  if (error instanceof SandwormAccountError) return fail(error.message, error.status)
  if (error instanceof AccountError || error instanceof ProviderUnavailableError) return fail(error.message, 503)
  if (error instanceof DynamicTokenError) return fail(error.message, 401)
  return fail("We couldn't sign you in", 401)
}

async function createAccount(identity: Awaited<ReturnType<typeof identify>>) {
  try {
    await ensureAccount(identity)
  } catch {
    throw new AccountError("We couldn't set up your account. Try again in a moment")
  }
}

// Turns a sign-in done in the browser into a session on our side. The browser hands over the token Dynamic gave it; it is checked here
// and never kept. The first time, the person's Sandworm account is made from it on the main app's API (`identify`), and their account here
// from that (`ensureAccount`); what is kept in the browser is our own cookie.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("This request didn't come from the app", 403)

  const parsed = body.safeParse(await request.json().catch(() => undefined))
  if (!parsed.success) return fail("The sign-in is missing something", 400)

  try {
    const identity = await identify(parsed.data.token)
    await createAccount(identity)

    const { done } = await readOnboarding(identity.id)
    const response = NextResponse.json({ ok: true, onboarded: done }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(SESSION_COOKIE, await signSession(identity.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    })
    return response
  } catch (error) {
    return failure(error)
  }
}
