import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SandwormAccountError, sandwormUserId } from "./sandworm"

const ID = "8e0f6a2e-0000-4000-8000-000000000001"
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

describe("sandwormUserId", () => {
  beforeEach(() => {
    vi.stubEnv("SANDWORM_API_URL", "https://api.example.com/api/")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("asks for nothing when there is no main app", async () => {
    vi.stubEnv("SANDWORM_API_URL", "")
    const fetch = vi.spyOn(globalThis, "fetch")
    expect(await sandwormUserId("t")).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it("sends the token and returns the account's id", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, { user: { id: ID }, roles: [] }))
    expect(await sandwormUserId("tok")).toBe(ID)
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe("https://api.example.com/api/auth/dynamic/login")
    expect(JSON.parse(String(init?.body))).toEqual({ token: "tok" })
  })

  it.each([
    ["the main app is down", () => Promise.reject(new Error("offline"))],
    ["it errors", () => Promise.resolve(reply(500))],
    ["it answers with something else", () => Promise.resolve(reply(200, { user: { id: "nope" } }))],
  ])("fails clearly when %s", async (_name, answer) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(answer)
    await expect(sandwormUserId("t")).rejects.toBeInstanceOf(SandwormAccountError)
  })
})
