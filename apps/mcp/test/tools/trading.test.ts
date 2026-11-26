import { describe, expect, it } from "vitest"

import { connect, fakeApi } from "../testing/connect"

describe("the trading tools", () => {
  it("sells with the id, escaped, in the path and the rest as the body", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "sell", arguments: { strategyId: "big tech/1", share: 0.5, symbols: ["AAPLc"] } })
    expect(api.post).toHaveBeenCalledWith("/strategies/big%20tech%2F1/sell", { symbols: ["AAPLc"], share: 0.5 })
  })

  it("puts money in", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "change_funds", arguments: { strategyId: "a", direction: "add", amount: 50 } })
    expect(api.post).toHaveBeenCalledWith("/strategies/a/funds", { direction: "add", amount: 50 })
  })

  it("starts a wallet trade with the signature the person made, and no more than that", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const trade = { strategyId: "a", mode: "live", amount: 100, address: "0xabc", expires: "2026-12-01T00:00:00Z", signature: "0xdef" }
    await client.callTool({ name: "start_trading", arguments: trade })
    expect(api.post).toHaveBeenCalledWith("/strategies/a/trade", { mode: "live", amount: 100, address: "0xabc", expires: "2026-12-01T00:00:00Z", signature: "0xdef" })
  })

  it("refuses an amount over what the app allows before it reaches the app", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const result = await client.callTool({ name: "change_funds", arguments: { strategyId: "a", direction: "add", amount: 1_000_000 } })
    expect(result.isError).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })
})
