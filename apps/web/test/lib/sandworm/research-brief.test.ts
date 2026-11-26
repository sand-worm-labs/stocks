// @vitest-environment node
import { describe, expect, it } from "vitest"

import { RESULT_MARKER } from "@/lib/sandworm/notebooks"
import type { Printed } from "@/lib/sandworm/producer"
import { askForResearch, askToFix, briefMarkdown, problemsWith } from "@/lib/sandworm/research-brief"
import type { StrategyRecord } from "@/types/store"

const record = {
  id: "r1",
  name: "Robotics",
  brief: "Robotics stocks, no more than 25% in one, and I'd panic at -20%",
  budget: 500,
  rules: [
    { type: "budget", amount: 500 },
    { type: "max-weight", limit: 0.25 },
    { type: "portfolio-stop", limit: 0.2 },
  ],
} as unknown as StrategyRecord
const inputs = { name: "Robotics" } as Parameters<typeof briefMarkdown>[1]

const growth = { kind: "growth", idx: [0, 5], strategy: [1, 1.1], bench: [1, 1.05] }
const drawdown = { kind: "drawdown", idx: [0, 5], strategy: [0, -3], bench: [0, -1] }
const backtest = {
  kind: "backtest", years: 3, from: "2023-11-27", to: "2026-11-24", cagr: 0.2, benchCagr: 0.17, sharpe: 0.8, beta: 0.9, alpha: 0.03,
  recent: { strategy: 0.09, bench: 0.12 }, stops: 0,
}
const risk = {
  kind: "risk", maxDrawdown: -0.24, benchMaxDrawdown: -0.19, worstMonth: { label: "2026-11", value: -0.11 }, stops: 0,
  risk: [{ symbol: "NVDAc", weight: 0.25, riskShare: 0.4 }],
}

describe("the brief the agent reads", () => {
  const brief = briefMarkdown(record, inputs)

  it("has the person's words and each rule in words", () => {
    expect(brief).toContain("Robotics stocks, no more than 25% in one")
    expect(brief).toContain("Max 25% in any one stock")
    expect(brief).toContain("Portfolio stop 20%")
  })

  it("says how to run the test, and exactly what to print", () => {
    expect(brief).toContain(`DATA["weights"]`)
    expect(brief).toContain(RESULT_MARKER.trim())
    for (const kind of ["backtest", "growth", "drawdown", "risk"]) expect(brief).toContain(`"kind":"${kind}"`)
  })
})

describe("the messages in the chat", () => {
  it("opens with one that fits what the chat takes, and points at the brief", () => {
    const message = askForResearch("Robotics, capped at 25%")
    expect(message.length).toBeLessThan(2000)
    expect(message).toContain("Brief")
    expect(message).toContain("Robotics, capped at 25%")
  })

  it("asks for a fix by saying what is missing", () => {
    expect(askToFix(['it never printed the "risk" line'])).toContain('it never printed the "risk" line')
  })
})

describe("what is wrong with what the notebook printed", () => {
  it("is nothing when every line is there", () => {
    expect(problemsWith([backtest, growth, drawdown, risk] as Printed[])).toEqual([])
  })

  it("names a line that was never printed", () => {
    expect(problemsWith([backtest, growth, drawdown] as Printed[])).toEqual(['it never printed the "risk" line'])
  })

  it("names the fields a line is missing or has wrong", () => {
    const { sharpe: _sharpe, ...thin } = backtest
    const [problem] = problemsWith([thin, growth, drawdown, risk] as Printed[])
    expect(problem).toContain('"backtest"')
    expect(problem).toContain("sharpe")
  })

  it("takes the last line of a kind, since the agent may have run it again", () => {
    const bad = { ...risk, risk: [] }
    expect(problemsWith([bad, backtest, growth, drawdown, risk] as Printed[])).toEqual([])
  })

  it("says all of them at once", () => {
    expect(problemsWith([])).toHaveLength(4)
  })
})
