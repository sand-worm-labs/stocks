// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import { middleware } from "@/middleware"

describe("who can open what", () => {
  it("sends someone who isn't signed in to sign in, except for a report shared by link", async () => {
    const page = await middleware(new NextRequest("http://localhost/strategies"))
    expect(page.status).toBe(307)
    expect(page.headers.get("location")).toContain("/signin")

    const shared = await middleware(new NextRequest("http://localhost/share/some-token"))
    expect(shared.headers.get("location")).toBeNull()
  })
})
