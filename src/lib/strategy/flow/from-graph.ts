import type { FlowEdge, FlowNode } from "./graph"
import type { Node, Strategy } from "../types"

export type FromGraph = { ok: true; strategy: Strategy } | { ok: false; error: string }

// The strategy a set of boxes and lines makes: the other way from `toGraph`. A graph being edited can be half done, so it says
// what is missing instead of guessing.
export function fromGraph(
  nodes: Pick<FlowNode, "id" | "data">[],
  edges: Pick<FlowEdge, "source" | "target" | "sourceHandle" | "data">[]
): FromGraph {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const start = nodes.find(({ data }) => data.spec.type === "start")
  if (!start || start.data.spec.type !== "start") return { ok: false, error: "There is no start block" }
  const { name, schedule } = start.data.spec

  const out = (id: string) =>
    edges.filter(({ source }) => source === id).sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0))
  const seen = new Set<string>()

  const build = (id: string): Node | string => {
    if (seen.has(id)) return "A block leads back to itself"
    seen.add(id)
    const block = byId.get(id)
    if (!block) return `A line leads to a block that is not there (${id})`
    const { spec } = block.data

    switch (spec.type) {
      case "start":
        return "The start block can only be the start"
      case "asset":
        return { type: "asset", symbol: spec.symbol }
      case "cash":
        return { type: "cash" }
      case "filter": {
        const { type, ...rest } = spec
        return { type, ...rest }
      }
      case "group": {
        const children: { node: Node; weight?: number }[] = []
        for (const { target, data } of out(id)) {
          const child = build(target)
          if (typeof child === "string") return child
          children.push(data?.weight === undefined ? { node: child } : { node: child, weight: data.weight })
        }
        if (!children.length) return `${spec.name ?? "A group"} has nothing in it`
        const { type, ...rest } = spec
        return { type, ...rest, children }
      }
      case "if": {
        const branch = (handle: "then" | "else") => {
          const line = out(id).find(({ sourceHandle }) => sourceHandle === handle)
          return line ? build(line.target) : `An if has no ${handle} path`
        }
        const yes = branch("then")
        if (typeof yes === "string") return yes
        const no = branch("else")
        if (typeof no === "string") return no
        return { type: "if", condition: spec.condition, then: yes, else: no }
      }
    }
  }

  const first = out(start.id)[0]
  if (!first) return { ok: false, error: "Nothing follows the start block" }
  const root = build(first.target)
  return typeof root === "string" ? { ok: false, error: root } : { ok: true, strategy: { name, schedule, root } }
}
