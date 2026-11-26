import { describe, expect, it, vi } from "vitest"

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }))

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue.current === undefined ? undefined : { value: cookieValue.current }),
  }),
}))
vi.mock("@/lib/markets/source", () => ({ getStocks: async () => [] }))
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T>(fn: T) => fn,
}))

import { getPortfolios } from "@/lib/portfolios/source"

const withCount = async (count: string | undefined) => {
  cookieValue.current = count
  return getPortfolios()
}

describe("getPortfolios", () => {
  it("makes as many portfolios as the owner picked, from none up", async () => {
    expect(await withCount("0")).toHaveLength(0)
    expect(await withCount("1")).toHaveLength(1)
    expect(await withCount("12")).toHaveLength(12)
    expect(await withCount("200")).toHaveLength(200)
  })

  it("makes none when nothing was picked or the pick is nonsense, so a person sees only their own", async () => {
    expect(await withCount(undefined)).toHaveLength(0)
    expect(await withCount("many")).toHaveLength(0)
    expect(await withCount("5000")).toHaveLength(0)
  })

  it("gives every portfolio its own id, however many there are", async () => {
    const ids = (await withCount("1000")).map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
