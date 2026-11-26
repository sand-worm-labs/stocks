import { describe, expect, it } from "vitest"

import { connect, fakeWeb, textOf } from "../testing/connect"

describe("the market tools", () => {
  it("lists only the stocks that can be bought when asked to", async () => {
    const web = fakeWeb()
    web.get.mockResolvedValue([
      { symbol: "AAPLc", isBuyable: true },
      { symbol: "OPENAI", isBuyable: false },
    ])
    const client = await connect(web)
    const result = await client.callTool({ name: "list_stocks", arguments: { buyableOnly: true } })
    expect(JSON.parse(textOf(result))).toEqual([{ symbol: "AAPLc", isBuyable: true }])
  })

  it("lists them all when not asked to", async () => {
    const web = fakeWeb()
    web.get.mockResolvedValue([{ symbol: "AAPLc" }, { symbol: "OPENAI" }])
    const client = await connect(web)
    const result = await client.callTool({ name: "list_stocks", arguments: {} })
    expect(JSON.parse(textOf(result))).toHaveLength(2)
  })

  it("reads one stock by its symbol", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "get_stock", arguments: { symbol: "AAPLc" } })
    expect(web.get).toHaveBeenCalledWith("/api/markets/stocks/AAPLc")
  })
})
