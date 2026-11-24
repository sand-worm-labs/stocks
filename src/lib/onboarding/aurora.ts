export type Rgba = [r: number, g: number, b: number, a: number]

// The aurora of the main app (abstract.svg there), as a sum. Two very large ellipses, one hanging from the top of the page and one
// rising from the bottom, each made of three layers: a pale glow, a violet band and a dark core. The layers are not centred on the same
// point, each sits a little further off the page than the one under it, so what shows of them is a band of each: dark at the edge of
// the page, then violet, then glow. Where the two ellipses meet in the middle only their glows are left, and add up into the bright band;
// at the sides the navy behind them shows. Everything is blurred. All of it is measured in the width and height of the page it was drawn on.
const LAYERS = {
  // How far across it reaches from the middle of the page, how far down from its own middle, and where its middle is for the one from the top and the one from the bottom
  glow: { across: 0.788, tall: 1.102, middles: [-0.657, 1.374] },
  violet: { across: 0.736, tall: 1.03, middles: [-0.75, 1.467] },
  core: { across: 0.684, tall: 0.957, middles: [-0.851, 1.568] },
} as const
// How far an edge is blurred, in widths of the ellipse
const SOFT = 0.1

// What the layers are, for each theme. On the light page the core is the page itself, and what is drawn is a tint; on the dark page it is
// the aurora as the main app has it.
const PALETTES = {
  light: {
    base: [72, 96, 214, 0.14],
    glow: [244, 236, 200, 0.34],
    violet: [122, 62, 220, 0.5],
  },
  dark: {
    base: [46, 72, 160, 1],
    glow: [232, 220, 214, 0.5],
    violet: [108, 55, 192, 1],
    core: [5, 2, 16, 1],
  },
} satisfies Record<string, Record<string, Rgba>>

// A layer laid over the colour held in `out` (red, green, blue and strength), at some strength. It changes `out` and makes nothing new, because
// this runs for every point of every frame.
function over(out: number[], [lr, lg, lb, la]: Rgba, strength: number) {
  const layer = la * strength
  const [r = 0, g = 0, b = 0, a = 0] = out
  const total = layer + a * (1 - layer)
  const keep = total ? (a * (1 - layer)) / total : 0
  const add = total ? layer / total : 0
  out[0] = lr * add + r * keep
  out[1] = lg * add + g * keep
  out[2] = lb * add + b * keep
  out[3] = total
}

// How much of a layer is at a distance from the middle of its ellipse, 1 being its edge: whole inside it, none outside, and eased across the blur
function inside(radius: number) {
  const k = Math.min(Math.max((radius - (1 - SOFT)) / (2 * SOFT), 0), 1)
  return 1 - k * k * (3 - 2 * k)
}

// The page at one moment, as a function of the point. Everything that is the same for the whole page at that moment (how each ellipse has
// breathed and drifted, how bright the glow is) is worked out once here, so what is left for each point is the small part that differs.
// `t` is in seconds. The ellipses breathe, drift up and down, and ripple along their edge, each out of step with the other, and the glow
// rises and falls. The function sets the colour of the point `x` across and `y` down the page (each 0 to 1) in `out`.
export function auroraFrame(t: number, dark = false) {
  const palette: { base: Rgba; glow: Rgba; violet: Rgba; core?: Rgba } = dark ? PALETTES.dark : PALETTES.light
  const shine = 0.9 + 0.1 * Math.sin(0.5 * t)

  const placed = ({ across, tall, middles }: (typeof LAYERS)[keyof typeof LAYERS]) =>
    middles.map((middle, i) => {
      const breath = 1 + 0.025 * Math.sin(0.3 * t + i * 2.4)
      return { across: across * breath, tall: tall * breath, middle: middle + 0.03 * Math.sin(0.22 * t + i * 2.4) }
    })
  const [glows, violets, cores] = [placed(LAYERS.glow), placed(LAYERS.violet), placed(LAYERS.core)]

  return (x: number, y: number, out: number[]) => {
    const across = x - 0.5
    let glow = 0
    let violet = 0
    let core = 0
    for (let i = 0; i < 2; i++) {
      const wave = 0.015 * Math.sin(6 * x + 0.5 * t + i * 2.4)
      const g = glows[i]
      const v = violets[i]
      const c = cores[i]
      if (!g || !v || !c) continue
      glow += inside(Math.hypot(across / g.across, (y - g.middle) / g.tall) + wave)
      violet = Math.max(violet, inside(Math.hypot(across / v.across, (y - v.middle) / v.tall) + wave))
      core = Math.max(core, inside(Math.hypot(across / c.across, (y - c.middle) / c.tall) + wave))
    }

    // Glows add up where the ellipses overlap, as they do in the main app; the violet and the core are the larger of the two
    out[0] = palette.base[0]
    out[1] = palette.base[1]
    out[2] = palette.base[2]
    out[3] = palette.base[3]
    over(out, palette.glow, Math.min(glow, 1) * shine)
    over(out, palette.violet, violet)
    // On the light page the core is cleared back to the page
    if (palette.core) over(out, palette.core, core)
    else out[3] = (out[3] ?? 0) * (1 - core)
  }
}

// The colour at one point and one moment, for when it isn't drawn a frame at a time
export function auroraAt(x: number, y: number, t: number, dark = false): Rgba {
  const out = [0, 0, 0, 0]
  auroraFrame(t, dark)(x, y, out)
  return out as Rgba
}
