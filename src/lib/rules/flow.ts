import type { RuleReading } from "./readings"

// How a trade is checked, drawn straight down: what the strategy wants, each rule it must pass in turn, your OK if you asked
// for it, and then the order. Made from the readings each time and never saved.

export type CheckKind = "decide" | "rule" | "approval" | "orders"
export type CheckState = "holds" | "watch" | "broken"

export type CheckData = {
  kind: CheckKind
  title: string
  detail?: string
  state: CheckState
  // How close to its line a rule is: 1 is on it
  closeness?: number
}

export type CheckNode = { id: string; type: "check"; position: { x: number; y: number }; data: CheckData }
export type CheckEdge = { id: string; source: string; target: string }

export const CHECK_WIDTH = 780
const STEP = 88
// A rule this close to its line is drawn as the one to watch
const WATCH = 0.85

const stateOf = (closeness?: number): CheckState =>
  closeness === undefined ? "holds" : closeness > 1 ? "broken" : closeness >= WATCH ? "watch" : "holds"

export function toChecksGraph(readings: RuleReading[], strategyName: string) {
  const rules = readings.filter(({ rule }) => rule.kind !== "approval")
  const approval = readings.find(({ rule }) => rule.kind === "approval")
  const broken = rules.some(({ closeness }) => stateOf(closeness) === "broken")

  const steps: Omit<CheckNode, "position" | "type">[] = [
    {
      id: "decide",
      data: { kind: "decide", title: strategyName, detail: "Works out what it wants to hold", state: "holds" },
    },
    ...rules.map(({ rule, closeness }) => ({
      id: `rule-${rule.id}`,
      data: {
        kind: "rule" as const,
        title: rule.label,
        // How near its line, not the reading: that is already said in the list of rules
        detail: closeness === undefined ? undefined : `${Math.round(closeness * 100)}% of the way to its limit`,
        state: stateOf(closeness),
        closeness,
      },
    })),
    ...(approval
      ? [
          {
            id: "approval",
            data: {
              kind: "approval" as const,
              title: approval.rule.label,
              detail: "Waits for your OK before anything is placed",
              state: "holds" as const,
            },
          },
        ]
      : []),
    {
      id: "orders",
      data: {
        kind: "orders",
        title: "Orders go out",
        detail: broken
          ? "Held back until every rule holds"
          : approval
            ? "Placed once you say OK"
            : "Placed once every rule holds",
        state: broken ? "broken" : "holds",
      },
    },
  ]

  const nodes: CheckNode[] = steps.map((step, i) => ({ ...step, type: "check", position: { x: 0, y: i * STEP } }))
  const edges: CheckEdge[] = nodes
    .slice(1)
    .map(({ id }, i) => ({ id: `${nodes[i]?.id}>${id}`, source: nodes[i]?.id ?? "", target: id }))

  return { nodes, edges, size: { width: CHECK_WIDTH, height: (nodes.length - 1) * STEP + 64 } }
}
