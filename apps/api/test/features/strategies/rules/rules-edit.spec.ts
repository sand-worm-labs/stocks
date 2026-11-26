import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { reportMockData } from "@/_mockdata/reports"
import { BRIEF, market } from "../../../support/pipeline-fixtures"
import { createLocalPipeline } from "@/features/strategies/design/local-pipeline"
import type { RuleSpec } from "@/features/strategies/rules/spec"
import { MemoryStore as FileStore } from "../../../support/memory-store"
import { repeatedKinds } from "@/features/strategies/rules/rules-edit"
import { createStrategyService, type StrategyService } from "@/features/strategies/lifecycle/strategy-lifecycle"

let service: StrategyService

beforeEach(async () => {
  service = createStrategyService({
    store: new FileStore(join(await mkdtemp(join(tmpdir(), "rules-edit-")), "s.json")),
    pipeline: createLocalPipeline(reportMockData[1]),
    market: async () => market,
    random: () => "t1",
  })
})

const newRules: RuleSpec[] = [
  { type: "budget", amount: 2_000 },
  { type: "max-weight", limit: 0.2 },
  { type: "portfolio-stop", limit: 0.15, pause: 42 },
]

describe("editing a strategy's rules", () => {
  it("replaces them, and the budget and the loss row follow", async () => {
    const draft = await service.create("u1", BRIEF)
    const edited = await service.editRules("u1", draft.id, newRules)

    expect(edited.rules).toEqual(newRules)
    expect(edited.budget).toBe(2_000)
    expect(edited.summary.find(({ label }) => label === "Loss you can live with")?.value).toBe("−15%")
    expect((await service.owned("u1", draft.id)).rules).toEqual(newRules)
  })

  it("drops the loss row when the new rules have no portfolio stop", async () => {
    const draft = await service.create("u1", BRIEF)
    const edited = await service.editRules("u1", draft.id, [{ type: "budget", amount: 500 }])
    expect(edited.summary.some(({ label }) => label === "Loss you can live with")).toBe(false)
  })

  it("refuses once the rules are confirmed, because the research is done on them", async () => {
    const draft = await service.create("u1", BRIEF)
    await service.confirmRules("u1", draft.id)
    await expect(service.editRules("u1", draft.id, newRules)).rejects.toMatchObject({ status: 409 })
    expect((await service.owned("u1", draft.id)).rules).not.toEqual(newRules)
  })

  it("refuses a rule said twice", async () => {
    const draft = await service.create("u1", BRIEF)
    const twice: RuleSpec[] = [{ type: "budget", amount: 500 }, { type: "budget", amount: 900 }]
    await expect(service.editRules("u1", draft.id, twice)).rejects.toMatchObject({ status: 400 })
  })

  it("is for the owner only", async () => {
    const draft = await service.create("u1", BRIEF)
    await expect(service.editRules("someone-else", draft.id, newRules)).rejects.toMatchObject({ status: 404 })
  })
})

describe("repeatedKinds", () => {
  it("names the kinds that appear more than once", () => {
    expect(repeatedKinds([{ type: "approval" }, { type: "approval" }, { type: "stop-loss", limit: 0.1 }, { type: "stop-loss", limit: 0.2 }])).toEqual(["approval"])
  })
})
