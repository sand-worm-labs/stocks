import { BLOCK_WIDTH, INDENT } from "@/lib/strategy/flow/graph"

import { isExit, type RuleReading } from "./readings"
import { explainRule, specOf } from "./spec"

// The rules as blocks on the same board as the strategy, set in under it: a block that says every trade is checked, a block for
// each rule under that, and last the order. Made from the readings each time and never saved.

export type CheckKind = "checks" | "rule" | "orders"
export type CheckState = "holds" | "watch" | "broken"

export type CheckData = {
  kind: CheckKind
  title: string
  detail?: string
  // The word a rule leads with, as in the list of rules: Never, Only or Always
  lead?: "Never" | "Only" | "Always"
  state: CheckState
  // How close to its line a rule is: 1 is on it
  closeness?: number
  // For the head: how many rules there are and how many are broken
  count?: number
  brokenCount?: number
  // What the head is called on its right, and what it counts, when it is not the rules a trade is checked against
  tag?: string
  noun?: "rule" | "exit"
  // Drawn in the exits colour rather than the rules'
  exit?: boolean
  // The word on a block's right, when it is not the one its state gives
  word?: string
}

export type CheckNode = { id: string; type: "check" | "checks"; position: { x: number; y: number }; data: CheckData }
export type CheckEdge = { id: string; source: string; target: string }

// A block is a bar of this height, with this much space before the next
const BAR = 52
const GAP = 14
// A rule this close to its line is drawn as the one to watch
const WATCH = 0.85

export const CHECKS_ID = "checks"
export const EXITS_ID = "exits"
export const CHECK_WIDTH = BLOCK_WIDTH

const stateOf = (closeness?: number): CheckState =>
  closeness === undefined ? "holds" : closeness > 1 ? "broken" : closeness >= WATCH ? "watch" : "holds"

// What happens to the order, given whether a rule is broken and whether you asked to say OK first
export const ordersLine = (broken: boolean, approval: boolean) =>
  broken ? "Held back until every rule holds" : approval ? "Placed once you say OK" : "Placed once every rule holds"

// Whether a rule that a trade is checked against is broken. An exit past its line is not that: it is sold, not held back.
const brokenIn = (readings: RuleReading[]) =>
  readings.some((reading) => !isExit(reading) && reading.rule.state === "broken")

// The check blocks drawn from `top` down, joined to the block called `from`: a head that says every trade is checked, and a block
// for each rule. Ids start with "checks", so hovering the head lights all of them. With no rules there is nothing to draw.
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
          // How near its line, not the reading: that is already said in the list of rules
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
  // The head hangs off `from`, and every rule off the head
  const edges: CheckEdge[] = nodes.map(({ id }, i) => ({
    id: `${i === 0 ? from : CHECKS_ID}>${id}`,
    source: i === 0 ? from : CHECKS_ID,
    target: id,
  }))

  return { nodes, edges, bottom: top + nodes.length * (BAR + GAP) - GAP }
}

// The exits drawn from `top` down, joined to the block called `from`: a head of their own and a block for each. They are watched on
// the whole portfolio and act by selling, so they sit apart from the rules every trade is checked against and never hold an order
// back. Ids start with "exits". With no exits there is nothing to draw.
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

// The order that goes out last, after what the strategy decides, joined to the block called `from`
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
