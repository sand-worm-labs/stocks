import { BLOCK_WIDTH, INDENT } from "@/lib/strategy/flow/graph"

import { isExit, type RuleReading } from "./readings"
import { explainRule, specOf } from "./spec"

type CheckKind = "checks" | "rule" | "orders"
export type CheckState = "holds" | "watch" | "broken"

export type CheckData = {
  kind: CheckKind
  title: string
  detail?: string
  lead?: "Never" | "Only" | "Always"
  state: CheckState
  // How close to its line a rule is: 1 is on it
  closeness?: number
  count?: number
  brokenCount?: number
  tag?: string
  noun?: "rule" | "exit"
  exit?: boolean
  word?: string
}

type CheckNode = { id: string; type: "check" | "checks"; position: { x: number; y: number }; data: CheckData }
type CheckEdge = { id: string; source: string; target: string }

const BAR = 52
const GAP = 14
const WATCH = 0.85

export const CHECKS_ID = "checks"
const EXITS_ID = "exits"
export const CHECK_WIDTH = BLOCK_WIDTH

const stateOf = (closeness?: number): CheckState =>
  closeness === undefined ? "holds" : closeness > 1 ? "broken" : closeness >= WATCH ? "watch" : "holds"

const ordersLine = (broken: boolean, approval: boolean) =>
  broken ? "Held back until every rule holds" : approval ? "Placed once you say OK" : "Placed once every rule holds"

// Whether a rule that a trade is checked against is broken. An exit past its line is not that: it is sold, not held back.
const brokenIn = (readings: RuleReading[]) =>
  readings.some((reading) => !isExit(reading) && reading.rule.state === "broken")

export function toChecks(all: RuleReading[], from: string, top: number) {
  // Exits are not checked against on every trade, so they are drawn apart, by `toExits`
  const readings = all.filter((reading) => !isExit(reading))
  if (!readings.length) return { nodes: [] as CheckNode[], edges: [] as CheckEdge[], bottom: top - GAP }

  const steps: { id: string; indent: number; data: CheckData }[] = [
    {
      id: CHECKS_ID,
      indent: 1,
      data: {
        kind: "checks",
        title: "Every trade is checked",
        detail: "Against each rule below. All must hold.",
        state: brokenIn(readings) ? "broken" : "holds",
        count: readings.length,
        brokenCount: readings.filter(({ rule }) => rule.state === "broken").length,
      },
    },
    ...readings.map(({ rule, closeness }) => {
      const spec = specOf(rule)
      return {
        id: `${CHECKS_ID}.${rule.id}`,
        indent: 2,
        data: {
          kind: "rule" as const,
          title: rule.label,
          detail: closeness === undefined ? undefined : `${Math.round(closeness * 100)}% of the way to its limit`,
          lead: spec ? explainRule(spec).lead : ("Always" as const),
          state: rule.state === "broken" ? ("broken" as const) : stateOf(closeness),
          closeness,
        },
      }
    }),
  ]

  const nodes: CheckNode[] = steps.map(({ id, indent, data }, i) => ({
    id,
    type: data.kind === "checks" ? "checks" : "check",
    position: { x: indent * INDENT, y: top + i * (BAR + GAP) },
    data,
  }))
  const edges: CheckEdge[] = nodes.map(({ id }, i) => ({
    id: `${i === 0 ? from : CHECKS_ID}>${id}`,
    source: i === 0 ? from : CHECKS_ID,
    target: id,
  }))

  return { nodes, edges, bottom: top + nodes.length * (BAR + GAP) - GAP }
}

export function toExits(all: RuleReading[], from: string, top: number) {
  const readings = all.filter(isExit)
  if (!readings.length) return { nodes: [] as CheckNode[], edges: [] as CheckEdge[], bottom: top - GAP }

  const steps: { id: string; indent: number; data: CheckData }[] = [
    {
      id: EXITS_ID,
      indent: 1,
      data: {
        kind: "checks",
        title: "Exits",
        detail: "Watched on the whole portfolio, apart from trades.",
        state: "holds",
        count: readings.length,
        tag: "Exits",
        noun: "exit",
        exit: true,
      },
    },
    ...readings.map(({ rule, closeness }) => {
      const triggered = closeness !== undefined && closeness > 1
      return {
        id: `${EXITS_ID}.${rule.id}`,
        indent: 2,
        data: {
          kind: "rule" as const,
          title: rule.label,
          detail:
            closeness === undefined
              ? undefined
              : triggered
                ? "Past its line, so it sells"
                : `${Math.round(closeness * 100)}% of the way to selling`,
          lead: "Always" as const,
          state: triggered
            ? ("watch" as const)
            : stateOf(closeness) === "watch"
              ? ("watch" as const)
              : ("holds" as const),
          word: triggered ? "Sells" : "Watching",
          exit: true,
          closeness,
        },
      }
    }),
  ]

  const nodes: CheckNode[] = steps.map(({ id, indent, data }, i) => ({
    id,
    type: data.kind === "checks" ? "checks" : "check",
    position: { x: indent * INDENT, y: top + i * (BAR + GAP) },
    data,
  }))
  const edges: CheckEdge[] = nodes.map(({ id }, i) => ({
    id: `${i === 0 ? from : EXITS_ID}>${id}`,
    source: i === 0 ? from : EXITS_ID,
    target: id,
  }))

  return { nodes, edges, bottom: top + nodes.length * (BAR + GAP) - GAP }
}

export function toOrders(readings: RuleReading[], from: string, top: number) {
  const broken = brokenIn(readings)
  const approval = readings.some(({ rule }) => rule.kind === "approval")
  const node: CheckNode = {
    id: "orders",
    type: "check",
    position: { x: INDENT, y: top },
    data: {
      kind: "orders",
      title: "Orders go out",
      detail: ordersLine(broken, approval),
      state: broken ? "broken" : "holds",
    },
  }
  return { node, edge: { id: `${from}>orders`, source: from, target: "orders" } as CheckEdge, bottom: top + BAR }
}
