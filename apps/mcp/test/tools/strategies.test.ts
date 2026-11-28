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

  it("tells the strategy's chat what the agent is doing, with the id escaped and the rest as the body", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const told = {
      status: "running",
      notebookUrl: "https://app.sandwormlab.xyz/n",
      parts: [{ type: "action", state: "ran", title: "Backtest", blockType: "python" }, { type: "text", text: "It made 12% a year." }],
    }
    await client.callTool({ name: "log_research", arguments: { strategyId: "big tech/1", ...told } })
    expect(api.post).toHaveBeenCalledWith("/strategies/big%20tech%2F1/research/log", told)
  })

  it("refuses a step it can't draw, and more than twenty at once, before they reach the app", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const wrong = await client.callTool({ name: "log_research", arguments: { strategyId: "a", parts: [{ type: "shout", text: "x" }] } })
    const many = await client.callTool({ name: "log_research", arguments: { strategyId: "a", parts: Array(21).fill({ type: "text", text: "x" }) } })
    expect([wrong.isError, many.isError]).toEqual([true, true])
    expect(api.post).not.toHaveBeenCalled()
  })

  it("lets the research name the strategy, which is the same field the app takes", async () => {
    const api = fakeApi()
    const client = await connect(api)
    const result = {
      headline: "Ahead of the market", summary: "It beat the S&P 500.", metrics: [{ label: "Return", value: "12%" }],
      notebook: { title: "Research", url: "https://app.sandwormlab.xyz/n" }, name: "Four growth stocks aiming for 20%",
    }
    await client.callTool({ name: "submit_research", arguments: { strategyId: "a", result } })
    expect(api.post).toHaveBeenCalledWith("/strategies/a/research", { result: expect.objectContaining({ name: "Four growth stocks aiming for 20%" }) })
  })
})
