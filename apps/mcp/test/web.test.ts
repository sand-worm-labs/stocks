import { describe, expect, it, vi } from "vitest"

import { createWeb, WebError } from "../src/web"

const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe("the app, called as the agent's person", () => {
  it("passes the agent's own token on, and sends a body as JSON", async () => {
    const fetchImpl = reply(200, { ok: true })
    await createWeb("http://app.test", "agent-secret", fetchImpl).post("/api/strategies/a/sell", { share: 0.5 })

    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(String(url)).toBe("http://app.test/api/strategies/a/sell")
    expect(init.method).toBe("POST")
    expect(init.headers.Authorization).toBe("Bearer agent-secret")
    expect(init.body).toBe('{"share":0.5}')
  })

  it("gives back what the app answered", async () => {
    const web = createWeb("http://app.test", "t", reply(200, [{ id: "a" }]))
    expect(await web.get("/api/strategies")).toEqual([{ id: "a" }])
  })

  it("says a refusal as the app said it", async () => {
    const web = createWeb("http://app.test", "t", reply(409, { error: "It isn't ready to trade" }))
    await expect(web.post("/api/strategies/a/trade")).rejects.toThrow(new WebError("It isn't ready to trade", 409))
  })

  it("says so when the app can't be reached", async () => {
    const web = createWeb("http://app.test", "t", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")))
    await expect(web.get("/api/strategies")).rejects.toThrow("could not be reached")
  })
})
