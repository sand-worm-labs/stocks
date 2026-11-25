import { describe, expect, it, vi } from "vitest"

import { connect, fakeWeb, textOf } from "./testing/connect"
import { WebError } from "../src/web"

// What every tool does when something goes wrong, tried on one
describe("when a tool fails", () => {
  it("says a refusal from the app as a plain sentence the agent can act on", async () => {
    const web = fakeWeb()
    web.post.mockRejectedValue(new WebError("It isn't ready to trade"))
    const client = await connect(web)
    const result = await client.callTool({ name: "start_trading", arguments: { strategyId: "a", mode: "paper", amount: 10 } })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toBe("It isn't ready to trade")
  })

  it("hides anything that is not a refusal", async () => {
    const web = fakeWeb()
    web.get.mockRejectedValue(new TypeError("secret detail"))
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const client = await connect(web)
    const result = await client.callTool({ name: "list_strategies", arguments: {} })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toBe("Something went wrong on our side")
  })
})
