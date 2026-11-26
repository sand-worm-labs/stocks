import { describe, expect, it } from "vitest"

import { NOT_FOR_AGENTS, TOOL_FOR } from "../src/parity"
import { appCalls } from "./testing/app-calls"
import { connect, fakeApi } from "./testing/connect"

describe("the app's API and the tools", () => {
  const calls = appCalls()

  it("finds the app's calls", () => {
    expect(calls.length).toBeGreaterThan(15)
  })

  it("has a tool for every call a person can make, or says why an agent can't", () => {
    const unknown = calls.filter((call) => !(call in TOOL_FOR) && !(call in NOT_FOR_AGENTS))
    expect(unknown, "These calls of the app have no tool. Add one in apps/mcp/src/tools and list it in parity.ts, or say in NOT_FOR_AGENTS why not").toEqual([])
  })

  it("lists no call the app doesn't have", () => {
    const listed = [...Object.keys(TOOL_FOR), ...Object.keys(NOT_FOR_AGENTS)]
    expect(listed.filter((call) => !calls.includes(call))).toEqual([])
  })

  it("has every tool the list names", async () => {
    const client = await connect(fakeApi())
    const names = (await client.listTools()).tools.map(({ name }) => name)
    for (const tool of new Set(Object.values(TOOL_FOR))) expect(names).toContain(tool)
  })
})
