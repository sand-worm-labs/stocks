import { describe, expect, it } from "vitest"

import { analyzeBrief } from "@/lib/brief/analyze"
import { briefFromPicks } from "@/lib/brief/fromPicks"

describe("an idea from picks", () => {
  it("is read back as including exactly what was picked", () => {
    const one = analyzeBrief(briefFromPicks(["Robotics"]))
    expect(one.fields.include.items.map((item) => item.toLowerCase())).toEqual(["robotics"])
    const many = analyzeBrief(briefFromPicks(["Robotics", "Tesla", "Apple"]))
    expect(many.fields.include.items.map((item) => item.toLowerCase())).toEqual(["robotics", "tesla", "apple"])
    expect(many.status).not.toBe("unreadable")
  })
})
