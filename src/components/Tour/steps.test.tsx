// @vitest-environment node
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { ROUTES } from "@/config/routes"
import { SECTIONS } from "@/constants/navigation"
import { getPortfolio } from "@/lib/portfolios/source"

import { CHAPTERS, TOUR_STEPS } from "./steps"

const SRC = join(process.cwd(), "src")
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
// Everything that can carry a tour name, not counting the tour's own files or tests
const source = walk(SRC)
  .filter((file) => /\.(tsx|ts)$/.test(file) && !/\.test\.|\/Tour\//.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n")

describe("the tour", () => {
  it("opens on a centred welcome and ends on a way into the app", () => {
    expect(TOUR_STEPS[0]).toMatchObject({ id: "welcome", mark: true })
    expect(TOUR_STEPS[0]?.target).toBeUndefined()
    expect(TOUR_STEPS.at(-1)?.action?.href).toBe("/strategies/new/brief")
  })

  it("has a title and a line for every step, and no step twice", () => {
    for (const { id, title, text } of TOUR_STEPS) {
      expect(title, id).not.toBe("")
      expect(text, id).not.toBe("")
    }
    expect(new Set(TOUR_STEPS.map(({ id }) => id)).size).toBe(TOUR_STEPS.length)
  })

  it("goes through its chapters in order, every chapter having a step", () => {
    const chapters = TOUR_STEPS.map(({ chapter }) => chapter)
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b))
    expect(new Set(chapters)).toEqual(new Set(CHAPTERS.map((_, i) => i)))
  })

  it("points only at tabs the navigation has, and at names the pages really carry", () => {
    const tabs = new Set(SECTIONS.map(({ route }) => `nav-${route}`))
    for (const { id, target } of TOUR_STEPS) {
      if (!target) continue
      if (target.startsWith("nav-")) expect(tabs.has(target), id).toBe(true)
      else expect(source.includes(`tour="${target}"`), `${id} points at ${target}`).toBe(true)
    }
  })

  it("opens only pages that exist", () => {
    const known = [ROUTES.portfolios.path, ROUTES.holdings.path, ROUTES.brief.path, "/strategies/steady-leaders"]
    for (const { id, route } of TOUR_STEPS) {
      if (!route) continue
      expect(
        known.some((path) => route === path || route.startsWith(`${path}/`)),
        id
      ).toBe(true)
    }
  })

  it("shows the pages a new strategy only has later on one that is live and already made", async () => {
    const example = await getPortfolio("steady-leaders")
    expect(example?.status).toBe("live")
  })
})
