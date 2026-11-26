import { describe, expect, it } from "vitest"

import { connect, fakeWeb } from "../testing/connect"

describe("the strategy tools", () => {
  it("renames with the id in the path and the name as the body", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "rename_strategy", arguments: { strategyId: "a", name: "Steady" } })
    expect(web.patch).toHaveBeenCalledWith("/api/strategies/a", { name: "Steady" })
  })

  it("reads a strategy's rules", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "get_rules", arguments: { strategyId: "big tech/1" } })
    expect(web.get).toHaveBeenCalledWith("/api/strategies/big%20tech%2F1/rules")
  })

  it("replaces the rules with the list it is given", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    const rules = [{ type: "budget", amount: 2000 }, { type: "max-weight", limit: 0.2 }]
    await client.callTool({ name: "edit_rules", arguments: { strategyId: "a", rules } })
    expect(web.put).toHaveBeenCalledWith("/api/strategies/a/rules", { rules })
  })

  it("refuses a rule of a kind that doesn't exist before it reaches the app", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    const result = await client.callTool({ name: "edit_rules", arguments: { strategyId: "a", rules: [{ type: "yolo" }] } })
    expect(result.isError).toBe(true)
    expect(web.put).not.toHaveBeenCalled()
  })

  it("reads one strategy's activity, or everyone's", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    await client.callTool({ name: "get_activity", arguments: { strategyId: "a" } })
    await client.callTool({ name: "get_activity", arguments: {} })
    expect(web.get).toHaveBeenNthCalledWith(1, "/api/strategies/a/activity")
    expect(web.get).toHaveBeenNthCalledWith(2, "/api/activity")
  })

  it("refuses research that is the wrong shape before it reaches the app", async () => {
    const web = fakeWeb()
    const client = await connect(web)
    const result = await client.callTool({ name: "submit_research", arguments: { strategyId: "a", result: { headline: "x" } } })
    expect(result.isError).toBe(true)
    expect(web.post).not.toHaveBeenCalled()
  })
})
