import { describe, expect, it, vi } from "vitest"

import { createApi, ApiError } from "../src/api"

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe("the app, called as the agent's person", () => {
  it("passes the agent's own token on, and sends a body as JSON", async () => {
    const fetchImpl = reply(200, { ok: true })
    await createApi("http://api.test", "agent-secret", fetchImpl).post("/strategies/a/sell", { share: 0.5 })

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toBe("http://api.test/strategies/a/sell")
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe("Bearer agent-secret")
    expect(init.body).toBe('{"share":0.5}')
  })

  it("gives back what the app answered", async () => {
    const api = createApi("http://api.test", "t", reply(200, [{ id: "a" }]))
    expect(await api.get("/strategies")).toEqual([{ id: "a" }])
  })

  it("says a refusal as the app said it", async () => {
    const api = createApi("http://api.test", "t", reply(409, { error: "It isn't ready to trade" }))
    await expect(api.post("/strategies/a/trade")).rejects.toThrow(new ApiError("It isn't ready to trade", 409))
  })

  it("says so when the app can't be reached", async () => {
    const api = createApi("http://api.test", "t", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
    await expect(api.get("/strategies")).rejects.toThrow("could not be reached")
  })
})
