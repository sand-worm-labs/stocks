// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { reportMockData } from "@/_mockdata/reports"
import { BRIEF, market } from "@/lib/pipeline/fixtures"
import { createLocalPipeline } from "@/lib/pipeline/local"
import { FileStore } from "@/lib/store/file"
import { rulesView } from "@/lib/strategies/rules-view"
import { createStrategyService, type StrategyService } from "@/lib/strategies/service"

let service: StrategyService

beforeEach(async () => {
  service = createStrategyService({
    store: new FileStore(join(await mkdtemp(join(tmpdir(), "rules-")), "s.json")),
    pipeline: createLocalPipeline(reportMockData[1]),
    market: async () => market,
    random: () => "t1",
  })
})

describe("a strategy's rules as its page shows them", () => {
  it("says each rule in words with the setting behind it, and that they are not confirmed yet", async () => {
    const draft = await service.create("u1", BRIEF)
    const view = rulesView(draft, [])

    expect(view.isConfirmed).toBe(false)
    expect(view.rules.length).toBeGreaterThan(0)
    for (const { label, setting } of view.rules) {
      expect(label.length).toBeGreaterThan(0)
      expect(setting).toBeDefined()
    }
    // Nothing is being measured before it trades
    expect(view.rules.every(({ standing }) => standing === undefined)).toBe(true)
  })

  it("is confirmed once the rules are locked", async () => {
    const draft = await service.create("u1", BRIEF)
    const locked = await service.confirmRules("u1", draft.id)
    expect(rulesView(locked, []).isConfirmed).toBe(true)
  })

  it("says how close each rule is to its limit once it is trading", async () => {
    const draft = await service.create("u1", BRIEF)
    await service.confirmRules("u1", draft.id)
    const ready = await service.finishResearch("u1", draft.id)
    const live = await service.goLive("u1", ready.id, 400, { mode: "paper" })

    const view = rulesView(live, [])
    const measured = view.rules.filter(({ standing }) => standing)
    expect(measured.length).toBeGreaterThan(0)
    expect(measured[0]?.standing).toMatchObject({ reading: expect.any(String), isBroken: expect.any(Boolean) })
  })
})
