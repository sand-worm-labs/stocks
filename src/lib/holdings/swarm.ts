export type Body = { x: number; y: number; vx: number; vy: number; r: number }
export type Size = { w: number; h: number }

// The share of the box the bubbles cover between them, so there is room left to move in
const FILL = 0.4
const MIN_RADIUS = 20
// No bubble is wider than this much of the box's shorter side
const MAX_RADIUS_SHARE = 0.32
const GAP = 3
// A pull to the middle, weaker along the longer side so the swarm spreads to the shape of its box, a little wandering and some friction: nothing is placed, the bubbles settle among themselves
const PULL = 0.0006
const WANDER = 0.06
const FRICTION = 0.9
const EASE = 0.12
const PASSES = 2
// A gain or loss this big shows in the full colour; smaller ones are paler
const FULL_COLOUR_AT = 0.12

// How wide each bubble wants to be: its area follows what is held, as a share of the box
export function radii(values: number[], { w, h }: Size): number[] {
  const total = values.reduce((sum, value) => sum + value, 0) || 1
  const widest = MAX_RADIUS_SHARE * Math.min(w, h)

  return values.map((value) =>
    Math.min(Math.max(Math.sqrt(((value / total) * FILL * w * h) / Math.PI), MIN_RADIUS), widest)
  )
}

// Where a bubble first appears: spread out from the middle, the same every time so the page renders the same
export function startAt(index: number, { w, h }: Size): Pick<Body, "x" | "y"> {
  const angle = index * 2.4
  const reach = Math.min(w, h) * 0.08 * Math.sqrt(index + 1)

  return { x: w / 2 + Math.cos(angle) * reach, y: h / 2 + Math.sin(angle) * reach }
}

// One moment of the swarm. `held` is the bubble someone has hold of, which goes where it is taken and is not pushed.
export function step(bodies: Body[], targets: number[], { w, h }: Size, held?: number, random = Math.random) {
  bodies.forEach((body, i) => {
    body.r += ((targets[i] ?? body.r) - body.r) * EASE
    if (i === held) return
    body.vx = (body.vx + (w / 2 - body.x) * PULL * Math.min(h / w, 1) + (random() - 0.5) * WANDER) * FRICTION
    body.vy = (body.vy + (h / 2 - body.y) * PULL + (random() - 0.5) * WANDER) * FRICTION
    body.x += body.vx
    body.y += body.vy
  })

  for (let pass = 0; pass < PASSES; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]
        const b = bodies[j]
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const apart = Math.hypot(dx, dy) || 0.01
        const overlap = a.r + b.r + GAP - apart
        if (overlap <= 0) continue
        const nx = dx / apart
        const ny = dy / apart
        // The one held does not give way, so the other moves all of it
        const aShare = i === held ? 0 : j === held ? 1 : 0.5
        a.x -= nx * overlap * aShare
        a.y -= ny * overlap * aShare
        b.x += nx * overlap * (1 - aShare)
        b.y += ny * overlap * (1 - aShare)
      }
    }
  }

  bodies.forEach((body) => {
    const x = Math.min(Math.max(body.x, body.r), w - body.r)
    const y = Math.min(Math.max(body.y, body.r), h - body.r)
    if (x !== body.x) body.vx *= -0.5
    if (y !== body.y) body.vy *= -0.5
    body.x = x
    body.y = y
  })
}

// The colour of a bubble: green as it gains, red as it loses, stronger the more it has
export function gainTint(gainRate: number, alpha = 0.14) {
  const strength = alpha + 0.46 * Math.min(Math.abs(gainRate) / FULL_COLOUR_AT, 1)
  return gainRate >= 0 ? `rgba(16, 185, 129, ${strength})` : `rgba(239, 68, 68, ${strength})`
}
