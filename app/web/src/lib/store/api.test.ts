import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { StrategyRecord } from "@/types/store"

import { ApiStore } from "./api"

const answer = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

describe("the API store", () => {
  beforeEach(() => {
    vi.stubEnv("STOCKS_API_URL", "http://api.test/")
    vi.stubEnv("STOCKS_API_KEY", "secret")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("asks for one person's strategies, with the key", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(200, [{ id: "a" }]))
    expect(await new ApiStore().list("owner 1")).toEqual([{ id: "a" }])

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe("http://api.test/strategies?ownerId=owner%201")
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret")
  })

  it("gives nothing for a strategy that is not there", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(404))
    expect(await new ApiStore().get("missing")).toBeUndefined()
  })

  it("sends the whole record to keep it", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(200))
    await new ApiStore().save({ id: "a", ownerId: "o" } as StrategyRecord)

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe("http://api.test/strategies/a")
    expect(init?.method).toBe("PUT")
    expect(JSON.parse(String(init?.body))).toEqual({ id: "a", ownerId: "o" })
  })

  it("fails loudly when the API does", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(500))
    await expect(new ApiStore().list("o")).rejects.toThrow("answered 500")
  })
})
