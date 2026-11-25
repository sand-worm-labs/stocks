import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SandwormAccountError, sandwormLogin, sandwormRefresh, sandwormUserId } from "./sandworm"

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

describe("sandwormLogin", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("keeps the person's access token from the cookie the login sets, and when it ends", async () => {
    vi.stubEnv("SANDWORM_API_URL", "https://api.example.com/api")
    const headers = new Headers({ "Content-Type": "application/json" })
    headers.append("Set-Cookie", "refresh_token=r; Path=/; HttpOnly")
    headers.append("Set-Cookie", "access_token=abc.def; Path=/; Expires=Wed, 25 Nov 2026 13:00:00 GMT; HttpOnly")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ user: { id: ID } }), { status: 200, headers }))

    expect(await sandwormLogin("tok")).toEqual({
      id: ID,
      login: {
        access: { value: "abc.def", expiresAt: Date.parse("2026-11-25T13:00:00Z") },
        refresh: { value: "r", expiresAt: undefined },
      },
    })
  })

  it("has no token to keep when the login sets no cookie", async () => {
    vi.stubEnv("SANDWORM_API_URL", "https://api.example.com/api")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, { user: { id: ID } }))
    expect((await sandwormLogin("tok"))?.login.access).toBeUndefined()
  })
})

describe("sandwormRefresh", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("sends the refresh token as the cookie and returns the new pair", async () => {
    vi.stubEnv("SANDWORM_API_URL", "https://api.example.com/api")
    const headers = new Headers()
    headers.append("Set-Cookie", "access_token=new-a; Path=/; Expires=Wed, 25 Nov 2026 14:00:00 GMT")
    headers.append("Set-Cookie", "refresh_token=new-r; Path=/")
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200, headers }))

    const login = await sandwormRefresh("old-r")
    expect(login?.access?.value).toBe("new-a")
    expect(login?.refresh?.value).toBe("new-r")
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe("https://api.example.com/api/auth/refresh")
    expect((init?.headers as Record<string, string>).Cookie).toBe("refresh_token=old-r")
  })

  it("gives nothing when Sandworm refuses", async () => {
    vi.stubEnv("SANDWORM_API_URL", "https://api.example.com/api")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }))
    expect(await sandwormRefresh("bad")).toBeUndefined()
  })
})

