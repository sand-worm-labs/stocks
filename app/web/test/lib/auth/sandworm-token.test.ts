// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const store = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined), set: (name: string, value: string) => void store.set(name, value) }),
}))
vi.mock("@/lib/auth/sandworm", () => ({ sandwormRefresh: vi.fn() }))

import { SANDWORM_COOKIE } from "@/lib/auth/config"
import { sandwormRefresh } from "@/lib/auth/sandworm"
import { getSandwormToken, openSandwormLogin, sandwormCookieAge, sealSandwormLogin } from "@/lib/auth/sandworm-token"

beforeEach(() => {
  vi.stubEnv("AUTH_SECRET", "a-secret-that-is-at-least-thirty-two-characters")
  store.clear()
  vi.mocked(sandwormRefresh).mockReset()
})

const inAnHour = () => Date.now() + 60 * 60 * 1000

describe("the sealed Sandworm login", () => {
  it("is kept sealed, and read back", async () => {
    const sealed = await sealSandwormLogin({ access: { value: "the-token", expiresAt: inAnHour() } })
    expect(sealed).not.toContain("the-token")
    expect((await openSandwormLogin(sealed))?.access?.value).toBe("the-token")
  })

  it("is not read back when tampered with or sealed under another secret", async () => {
    const sealed = await sealSandwormLogin({ access: { value: "t" } })
    expect(await openSandwormLogin(`${sealed}x`)).toBeUndefined()
    vi.stubEnv("AUTH_SECRET", "another-secret-that-is-also-thirty-two-chars")
    expect(await openSandwormLogin(sealed)).toBeUndefined()
  })

  it("is kept as long as its longest-lived token works, and never longer than our own session", () => {
    expect(sandwormCookieAge({ access: { value: "a", expiresAt: 10_000 }, refresh: { value: "r", expiresAt: 50_000 } }, 0)).toBe(50)
    expect(sandwormCookieAge({ access: { value: "a", expiresAt: Number.MAX_SAFE_INTEGER } }, 0)).toBe(60 * 60 * 24 * 7)
    expect(sandwormCookieAge({ access: { value: "a", expiresAt: 0 } }, 5000)).toBe(0)
  })
})

describe("the person's access token on Sandworm", () => {
  const keep = async (login: Parameters<typeof sealSandwormLogin>[0]) => void store.set(SANDWORM_COOKIE, await sealSandwormLogin(login))

  it("is given while it works", async () => {
    await keep({ access: { value: "live", expiresAt: inAnHour() } })
    expect(await getSandwormToken()).toBe("live")
    expect(sandwormRefresh).not.toHaveBeenCalled()
  })

  it("is made again from the refresh token when it has run out, and the new pair is kept", async () => {
    await keep({ access: { value: "old", expiresAt: 1 }, refresh: { value: "r1", expiresAt: inAnHour() } })
    vi.mocked(sandwormRefresh).mockResolvedValue({ access: { value: "new", expiresAt: inAnHour() }, refresh: { value: "r2", expiresAt: inAnHour() } })

    expect(await getSandwormToken()).toBe("new")
    expect(sandwormRefresh).toHaveBeenCalledWith("r1")
    const kept = await openSandwormLogin(store.get(SANDWORM_COOKIE))
    expect(kept?.refresh?.value).toBe("r2")
  })

  it("is nothing when both have run out, or Sandworm won't renew it, or there is no login at all", async () => {
    expect(await getSandwormToken()).toBeUndefined()

    await keep({ access: { value: "old", expiresAt: 1 }, refresh: { value: "r", expiresAt: 1 } })
    expect(await getSandwormToken()).toBeUndefined()

    await keep({ access: { value: "old", expiresAt: 1 }, refresh: { value: "r", expiresAt: inAnHour() } })
    vi.mocked(sandwormRefresh).mockResolvedValue(undefined)
    expect(await getSandwormToken()).toBeUndefined()
  })
})
