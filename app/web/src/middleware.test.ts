// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { ONBOARDING_COOKIES } from "@/constants/onboarding"
import { SESSION_COOKIE } from "@/lib/auth/config"
import { signSession } from "@/lib/auth/token"

import { middleware } from "./middleware"

const ORIGIN = "http://localhost:3001"

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-1234"
})
afterEach(() => vi.unstubAllEnvs())

async function go(path: string, { userId, onboardedAs }: { userId?: string; onboardedAs?: string } = {}) {
  const cookies = [
    userId && `${SESSION_COOKIE}=${await signSession(userId)}`,
    onboardedAs && `${ONBOARDING_COOKIES.done}=${onboardedAs}`,
  ].filter(Boolean)
  const response = await middleware(new NextRequest(`${ORIGIN}${path}`, { headers: { cookie: cookies.join("; ") } }))
  const to = response.headers.get("location")
  return to ? new URL(to).pathname + new URL(to).search : "pass"
}

describe("signed out", () => {
  it("is sent to sign in from the home page, with nowhere to come back to", async () => {
    expect(await go("/")).toBe("/signin")
  })

  it("is sent to sign in from every page, the open ones included, and brought back to it", async () => {
    for (const path of [
      "/strategies",
      "/holdings",
      "/markets",
      "/markets/NVDAc",
      "/activity",
      "/settings",
      "/onboarding",
    ]) {
      expect(await go(path), path).toBe(`/signin?next=${encodeURIComponent(path)}`)
    }
    expect(await go("/holdings?view=stocks")).toBe(`/signin?next=${encodeURIComponent("/holdings?view=stocks")}`)
  })

  it("can open the sign-in page", async () => {
    expect(await go("/signin")).toBe("pass")
  })

  it("is not let in by a session that isn't ours", async () => {
    const response = await middleware(
      new NextRequest(`${ORIGIN}/strategies`, { headers: { cookie: `${SESSION_COOKIE}=forged` } })
    )
    expect(response.headers.get("location")).toContain("/signin")
  })
})

describe("signed in for the first time", () => {
  it("goes to the first run from anywhere, and the sign-in page", async () => {
    for (const path of ["/", "/strategies", "/holdings", "/markets", "/signin"]) {
      expect(await go(path, { userId: "u1" }), path).toBe("/onboarding")
    }
  })

  it("can open the first run itself", async () => {
    expect(await go("/onboarding", { userId: "u1" })).toBe("pass")
  })

  it("goes through it even on a browser another account has been through it on", async () => {
    expect(await go("/strategies", { userId: "u2", onboardedAs: "u1" })).toBe("/onboarding")
  })
})

describe("signed in and past the first run", () => {
  const me = { userId: "u1", onboardedAs: "u1" }

  it("opens every page", async () => {
    for (const path of ["/", "/strategies", "/holdings", "/markets", "/activity", "/settings", "/onboarding"]) {
      expect(await go(path, me), path).toBe("pass")
    }
  })

  it("is sent on from the sign-in page, to where they were going, or the strategies", async () => {
    expect(await go("/signin", me)).toBe("/strategies")
    expect(await go("/signin?next=/holdings", me)).toBe("/holdings")
  })

  it("is not sent to another site by a sign-in link", async () => {
    expect(await go("/signin?next=//evil.example", me)).toBe("/strategies")
    expect(await go("/signin?next=https://evil.example", me)).toBe("/strategies")
  })
})

describe("with sign-in switched off", () => {
  it("lets everything through, for working on the app without a wallet", async () => {
    vi.stubEnv("AUTH_REQUIRED", "false")
    for (const path of ["/", "/strategies", "/onboarding"]) expect(await go(path), path).toBe("pass")
  })

  it("is on unless it is switched off", async () => {
    vi.stubEnv("AUTH_REQUIRED", "")
    expect(await go("/strategies")).toContain("/signin")
  })
})
