// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

import { ONBOARDING_COOKIES } from "@/constants/onboarding"

const deleted = vi.hoisted(() => [] as string[])

vi.mock("next/headers", () => ({ cookies: async () => ({ delete: (name: string) => deleted.push(name) }) }))
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }))
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirected to ${to}`)
  },
}))
vi.mock("@/lib/auth/session", () => ({ getSignedInUserId: async () => undefined }))
vi.mock("@/lib/onboarding/source", () => ({ getStarter: async () => undefined }))

import { resetOnboarding } from "@/lib/onboarding/actions"

afterEach(() => {
  vi.unstubAllEnvs()
  deleted.length = 0
})

describe("resetOnboarding", () => {
  it("forgets what this browser has answered and starts the first run again, while developing", async () => {
    await expect(resetOnboarding()).rejects.toThrow("redirected to /onboarding")
    expect(deleted.toSorted()).toEqual(Object.values(ONBOARDING_COOKIES).toSorted())
  })

  it("does nothing in production, however it is reached", async () => {
    vi.stubEnv("NODE_ENV", "production")
    await expect(resetOnboarding()).rejects.toThrow("only be reset while developing")
    expect(deleted).toEqual([])
  })
})
