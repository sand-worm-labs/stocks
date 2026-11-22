// @vitest-environment node
import { SignJWT } from "jose"
import { beforeAll, describe, expect, it } from "vitest"

import { readSession, signSession } from "./token"

const USER = "3f9c1a52-8d41-4a3e-b7aa-0c61d2e9f845"

beforeAll(() => {
  process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough-to-use"
})

describe("session tokens", () => {
  it("reads back who a session was made for", async () => {
    expect(await readSession(await signSession(USER))).toBe(USER)
  })

  it("refuses a token that was changed", async () => {
    const token = await signSession(USER)
    expect(await readSession(`${token.slice(0, -2)}xx`)).toBeUndefined()
  })

  it("refuses a token signed with another secret", async () => {
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER)
      .setIssuer("sandworm-stocks")
      .setAudience("session")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("another-secret-that-is-also-long-enough!!"))
    expect(await readSession(forged)).toBeUndefined()
  })

  it("refuses a missing token", async () => {
    expect(await readSession(undefined)).toBeUndefined()
  })
})
