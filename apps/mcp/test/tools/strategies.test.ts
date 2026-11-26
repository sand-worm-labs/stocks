import { describe, expect, it } from "vitest"

import { connect, fakeApi } from "../testing/connect"

describe("the strategy tools", () => {
  it("renames with the id in the path and the name as the body", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "rename_strategy", arguments: { strategyId: "a", name: "Steady" } })
    expect(api.patch).toHaveBeenCalledWith("/strategies/a", { name: "Steady" })
  })

  it("reads a strategy's rules", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "get_rules", arguments: { strategyId: "big tech/1" } })
    expect(api.get).toHaveBeenCalledWith("/strategies/big%20tech%2F1/rules")
  })

  it("replaces the rules with the list it is given", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const rules = [{ type: "budget", amount: 2000 }, { type: "max-weight", limit: 0.2 }]
    await client.callTool({ name: "edit_rules", arguments: { strategyId: "a", rules } })
    expect(api.put).toHaveBeenCalledWith("/strategies/a/rules", { rules })
  })

  it("refuses a rule of a kind that doesn't exist before it reaches the app", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const result = await client.callTool({ name: "edit_rules", arguments: { strategyId: "a", rules: [{ type: "yolo" }] } })
    expect(result.isError).toBe(true)
    expect(api.put).not.toHaveBeenCalled()
  })

  it("reads one strategy's activity, or everyone's", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "get_activity", arguments: { strategyId: "a" } })
    await client.callTool({ name: "get_activity", arguments: {} })
    expect(api.get).toHaveBeenNthCalledWith(1, "/strategies/a/activity")
    expect(api.get).toHaveBeenNthCalledWith(2, "/activity")
  })

  it("refuses research that is the wrong shape before it reaches the app", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const result = await client.callTool({ name: "submit_research", arguments: { strategyId: "a", result: { headline: "x" } } })
    expect(result.isError).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })
})
