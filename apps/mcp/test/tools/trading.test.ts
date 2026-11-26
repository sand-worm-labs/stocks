import { describe, expect, it } from "vitest"

import { connect, fakeWeb } from "../testing/connect"

describe("the trading tools", () => {
  it("sells with the id, escaped, in the path and the rest as the body", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "sell", arguments: { strategyId: "big tech/1", share: 0.5, symbols: ["AAPLc"] } })
    expect(web.post).toHaveBeenCalledWith("/api/strategies/big%20tech%2F1/sell", { symbols: ["AAPLc"], share: 0.5 })
  })

  it("puts money in", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "change_funds", arguments: { strategyId: "a", direction: "add", amount: 50 } })
    expect(web.post).toHaveBeenCalledWith("/api/strategies/a/funds", { direction: "add", amount: 50 })
  })

  it("starts a wallet trade with the signature the person made, and no more than that", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    const trade = { strategyId: "a", mode: "live", amount: 100, address: "0xabc", expires: "2026-12-01T00:00:00Z", signature: "0xdef" }
    await client.callTool({ name: "start_trading", arguments: trade })
    expect(web.post).toHaveBeenCalledWith("/api/strategies/a/trade", { mode: "live", amount: 100, address: "0xabc", expires: "2026-12-01T00:00:00Z", signature: "0xdef" })
  })

  it("refuses an amount over what the app allows before it reaches the app", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    const result = await client.callTool({ name: "change_funds", arguments: { strategyId: "a", direction: "add", amount: 1_000_000 } })
    expect(result.isError).toBe(true)
    expect(web.post).not.toHaveBeenCalled()
  })
})
