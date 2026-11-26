import { describe, expect, it } from "vitest"

import { connect, fakeApi, textOf } from "../testing/connect"

describe("the market tools", () => {
  it("lists only the stocks that can be bought when asked to", async () => {
    const api = fakeApi()
    api.get.mockResolvedValue([
      { symbol: "AAPLc", isBuyable: true },
      { symbol: "OPENAI", isBuyable: false },
    ])
    const client = await connect(api)
    const result = await client.callTool({ name: "list_stocks", arguments: { buyableOnly: true } })
    expect(JSON.parse(textOf(result))).toEqual([{ symbol: "AAPLc", isBuyable: true }])
  })

  it("lists them all when not asked to", async () => {
    const api = fakeApi()
    api.get.mockResolvedValue([{ symbol: "AAPLc" }, { symbol: "OPENAI" }])
    const client = await connect(api)
    const result = await client.callTool({ name: "list_stocks", arguments: {} })
    expect(JSON.parse(textOf(result))).toHaveLength(2)
  })

  it("reads one stock by its symbol", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "get_stock", arguments: { symbol: "AAPLc" } })
    expect(api.get).toHaveBeenCalledWith("/markets/stocks/AAPLc")
  })
})
