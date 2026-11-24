import { describe, expect, it } from "vitest"

import { foldablePaths, INDENT, toGraph } from "./graph"
import { getStrategy } from "../source"
import type { Strategy } from "../types"

const hold = (symbol: string): Strategy => ({ name: "Hold", schedule: "monthly", root: { type: "asset", symbol } })

describe("toGraph", () => {
  it("draws a start box that leads to the first block", () => {
    const { nodes, edges } = toGraph(hold("AAA"))
    expect(nodes.map(({ id }) => id)).toEqual(["start", "root"])
    expect(edges).toEqual([{ id: "start>root", source: "start", target: "root", data: { order: 0 } }])
  })

  it("draws a then and an else line from an if, each from its own handle", () => {
    const { edges } = toGraph({
      name: "Gate",
      schedule: "daily",
      root: {
        type: "if",
        condition: { left: { symbol: "AAA", indicator: { kind: "price" } }, op: ">", right: { value: 10 } },
        then: { type: "asset", symbol: "AAA" },
        else: { type: "asset", symbol: "BBB" },
      },
    })
    expect(
      edges.filter(({ source }) => source === "root").map(({ sourceHandle, label }) => [sourceHandle, label])
    ).toEqual([
      ["then", "Then"],
      ["else", "Else"],
    ])
  })

  it("labels a weighted group's lines with each share", () => {
    const { edges } = toGraph({
      name: "Mix",
      schedule: "weekly",
      root: {
        type: "group",
        weighting: "specified",
        children: [
          { node: { type: "asset", symbol: "AAA" }, weight: 3 },
          { node: { type: "asset", symbol: "BBB" }, weight: 1 },
        ],
      },
    })
    expect(edges.filter(({ source }) => source === "root").map(({ label }) => label)).toEqual(["75%", "25%"])
  })

  it("gives every block its own place, and nests as deep as the strategy does", async () => {
    const { nodes } = toGraph(await getStrategy())
    const places = nodes.map(({ position }) => `${position.x},${position.y}`)
    expect(new Set(places).size).toBe(nodes.length)
    const depths = nodes.map(({ position }) => position.x / INDENT)
    expect(Math.max(...depths)).toBeGreaterThanOrEqual(3)
  })

  it("reads straight down: each block is below the one before it, never beside it", async () => {
    const { nodes } = toGraph(await getStrategy())
    const ys = nodes.map(({ position }) => position.y)
    expect(ys).toEqual([...ys].sort((a, b) => a - b))
    expect(new Set(ys).size).toBe(ys.length)
  })

  it("names each block by its path in the strategy", async () => {
    const { nodes } = toGraph(await getStrategy())
    expect(nodes.find(({ id }) => id === "root.then")?.data.path).toBe("root.then")
    expect(new Set(nodes.map(({ id }) => id)).size).toBe(nodes.length)
  })

  it("is the same every time", async () => {
    const strategy = await getStrategy()
    expect(toGraph(strategy)).toEqual(toGraph(strategy))
  })
})

describe("toGraph, compressed", () => {
  it("makes a group of nothing but stocks one block, with the stocks as tags and their shares", async () => {
    const strategy = await getStrategy()
    const full = toGraph(strategy)
    const tidy = toGraph(strategy, { tidy: true })
    expect(tidy.nodes.length).toBeLessThan(full.nodes.length)
    expect(tidy.size.height).toBeLessThan(full.size.height)
    const safe = tidy.nodes.find(({ data }) => data.title === "Play it safe")
    expect(safe?.data.chips?.map(({ symbol }) => symbol)).toEqual(["AAPLc", "GOOGLc", "METAc"])
    expect(tidy.nodes.some(({ id }) => id.startsWith("root.else.else."))).toBe(false)
  })

  it("puts a weighted group's shares on its tags", () => {
    const { nodes } = toGraph(
      {
        name: "Mix",
        schedule: "weekly",
        root: {
          type: "group",
          weighting: "specified",
          children: [
            { node: { type: "asset", symbol: "AAA" }, weight: 3 },
            { node: { type: "asset", symbol: "BBB" }, weight: 1 },
          ],
        },
      },
      { tidy: true }
    )
    expect(nodes.find(({ id }) => id === "root")?.data.chips).toEqual([
      { symbol: "AAA", note: "75%", percent: 75 },
      { symbol: "BBB", note: "25%", percent: 25 },
    ])
  })

  it("leaves out what is inside a block that is folded, and says how much", async () => {
    const strategy = await getStrategy()
    const { nodes, edges } = toGraph(strategy, { folded: new Set(["root.then"]) })
    const folded = nodes.find(({ id }) => id === "root.then")
    expect(folded?.data).toMatchObject({ folded: true, hidden: 2 })
    expect(nodes.some(({ id }) => id.startsWith("root.then."))).toBe(false)
    expect(edges.some(({ source }) => source === "root.then")).toBe(false)
  })

  it("lists the blocks that can be folded", async () => {
    const strategy = await getStrategy()
    expect(foldablePaths(strategy)).toEqual(["root", "root.then", "root.else", "root.else.else"])
    expect(foldablePaths(strategy, { tidy: true })).toEqual(["root", "root.then", "root.else"])
  })
})
