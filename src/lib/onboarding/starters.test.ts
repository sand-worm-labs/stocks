import { describe, expect, it } from "vitest"

import { pickStarters } from "./starters"
import type { Starter } from "./types"

const starter = (id: string, themes: string[]): Starter => ({
  id,
  title: id,
  themes,
  symbols: [],
  oneYearReturn: 0.1,
  series: [1, 2],
  brief: "",
})

const all = [
  starter("robotics", ["robotics"]),
  starter("ai", ["ai"]),
  starter("big-tech", ["big-tech"]),
  starter("hardware", ["hardware"]),
]
const ids = (list: Starter[]) => list.map(({ id }) => id)

describe("choosing starters", () => {
  it("puts the ones for the themes picked first", () => {
    expect(ids(pickStarters(all, ["hardware"]))[0]).toBe("hardware")
  })

  it("offers three, filling up with the others after those that match", () => {
    expect(ids(pickStarters(all, ["ai", "robotics"]))).toEqual(["robotics", "ai", "big-tech"])
  })

  it("offers the general ones to someone who isn't sure", () => {
    expect(ids(pickStarters(all, ["not-sure"]))).toEqual(["robotics", "ai", "big-tech"])
    expect(ids(pickStarters(all, []))).toHaveLength(3)
  })

  it("offers what it has when it has fewer than three", () => {
    expect(pickStarters(all.slice(0, 2), ["ai"])).toHaveLength(2)
  })
})
