import { afterEach, describe, expect, it, vi } from "vitest"

import { call, confirmRules, createStrategy } from "@/lib/strategies/client"

const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

describe("what the browser sends to the API", () => {
  it("sends no content type with a button that has nothing to send, which the API refuses with a body-less JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer({ stage: "researching" }))
    vi.stubGlobal("fetch", fetchMock)

    await confirmRules("s1")

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe("/api/strategies/s1/confirm")
    expect(init.method).toBe("POST")
    expect(init.body).toBeUndefined()
    expect(init.headers).toBeUndefined()
  })

  it("says it is JSON when there is a body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(answer({ id: "s2" }))
    vi.stubGlobal("fetch", fetchMock)

    await createStrategy("Grow 500 USDC")

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toEqual({ "Content-Type": "application/json" })
    expect(init.body).toBe(JSON.stringify({ brief: "Grow 500 USDC" }))
  })

  it("carries what the API refused with, in its words", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(answer({ error: "Its rules are already confirmed" }, 409)))
    await expect(call("/api/strategies/s1/confirm", "POST")).rejects.toMatchObject({ message: "Its rules are already confirmed", status: 409 })
  })
})
