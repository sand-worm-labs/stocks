import { describe, expect, it } from "vitest"

import { type Body, radii, startAt, step } from "./swarm"

const SIZE = { w: 800, h: 400 }
const calm = () => 0.5

describe("radii", () => {
  it("makes what is held more of wider", () => {
    const [big, small] = radii([9000, 1000], SIZE)
    expect(big).toBeGreaterThan(small ?? 0)
  })

  it("never lets a bubble vanish or fill the box", () => {
    const [tiny, huge] = radii([1, 1_000_000], SIZE)
    expect(tiny).toBeGreaterThanOrEqual(20)
    expect(huge).toBeLessThanOrEqual(0.32 * SIZE.h)
  })
})

describe("step", () => {
  const spawn = (count: number): Body[] =>
    Array.from({ length: count }, (_, i) => ({ ...startAt(i, SIZE), vx: 0, vy: 0, r: 30 }))

  it("settles bubbles apart, inside the box", () => {
    const bodies = spawn(12)
    const targets = bodies.map(() => 30)
    for (let i = 0; i < 400; i++) step(bodies, targets, SIZE, undefined, calm)

    for (const [i, a] of bodies.entries()) {
      expect(a.x).toBeGreaterThanOrEqual(a.r - 0.01)
      expect(a.x).toBeLessThanOrEqual(SIZE.w - a.r + 0.01)
      expect(a.y).toBeGreaterThanOrEqual(a.r - 0.01)
      expect(a.y).toBeLessThanOrEqual(SIZE.h - a.r + 0.01)
      for (const b of bodies.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r - 1)
    }
  })

  it("does not move the bubble that is held", () => {
    const bodies = spawn(3)
    const held = bodies[0] as Body
    const at = { x: held.x, y: held.y }
    for (let i = 0; i < 50; i++) step(bodies, [30, 30, 30], SIZE, 0, calm)
    expect({ x: held.x, y: held.y }).toEqual(at)
  })
})
