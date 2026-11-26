import { describe, expect, it } from "vitest"

import { connect, fakeApi } from "../testing/connect"

describe("the tools for closing and deleting a strategy", () => {
  it("closes a trading strategy", async () => {
    const api = fakeApi()
    await (await connect(api)).callTool({ name: "close_strategy", arguments: { strategyId: "big tech/1" } })
    expect(api.post).toHaveBeenCalledWith("/strategies/big%20tech%2F1/close")
  })

  it("puts a strategy in the trash, and back", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "delete_strategy", arguments: { strategyId: "a" } })
    expect(api.delete).toHaveBeenCalledWith("/strategies/a")
    await client.callTool({ name: "restore_strategy", arguments: { strategyId: "a" } })
    expect(api.post).toHaveBeenCalledWith("/strategies/a/restore")
    await client.callTool({ name: "list_trash", arguments: {} })
    expect(api.get).toHaveBeenCalledWith("/strategies/trash")
  })

  it("deletes for good only with the strategy's name, which is sent as the body", async () => {
    const api = fakeApi()
    const client = await connect(api)
    await client.callTool({ name: "purge_strategy", arguments: { strategyId: "a", confirmName: "Big tech" } })
    expect(api.post).toHaveBeenCalledWith("/strategies/a/purge", { confirmName: "Big tech" })

    const refused = await client.callTool({ name: "purge_strategy", arguments: { strategyId: "a" } })
    expect(refused.isError).toBe(true)
  })

  it("says what the app refused, in its words", async () => {
    const api = fakeApi()
    const { ApiError } = await import("../../src/api")
    api.delete.mockRejectedValue(new ApiError("It is still trading: it holds 3 stocks and 0.00 USDC in cash. Close it first", 409))
    const answer = await (await connect(api)).callTool({ name: "delete_strategy", arguments: { strategyId: "a" } })
    expect(answer.isError).toBe(true)
    expect((answer.content as { text: string }[])[0]?.text).toMatch(/Close it first/)
  })
})
