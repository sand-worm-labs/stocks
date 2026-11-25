import type { Condition, Indicator, Node, Schedule, Side, Strategy, Via, Weighting } from "@/types/strategy"
import { editorHeight } from "../condition"
import { describeCondition, describeIndicator } from "../describe"

// A strategy drawn as boxes and lines, for React Flow. The strategy is the one thing that is kept: the boxes are made from it,
// and it can be made again from them. Each box carries everything it is (`spec`) and each line where it sits among its
// brothers, so nothing is lost either way, and where a box is drawn is worked out from the strategy's shape.

export type BlockKind = "start" | "asset" | "cash" | "group" | "if" | "filter" | "rebalance"

type BlockSpec =
  | { type: "start"; name: string; schedule: Schedule }
  | { type: "asset"; symbol: string; side?: Side; via?: Via }
  | { type: "cash" }
  | { type: "group"; name?: string; weighting: Weighting; days?: number }
  | { type: "if"; condition: Condition }
  | { type: "rebalance"; drift: number; every: Schedule }
  | {
      type: "filter"
      pick: "top" | "bottom"
      count: number
      by: Indicator
      from: string[]
      weighting?: "equal" | "inverse-volatility"
      days?: number
    }

type Chip = { symbol: string; note?: string; percent?: number }

export type BlockData = {
  block: BlockKind
  title: string
  detail?: string
  weightType?: string
  chips?: Chip[]
  path: string
  spec: BlockSpec
  foldable?: boolean
  folded?: boolean
  hidden?: number
}

type EdgeData = {
  order: number
  weight?: number
  share?: number
}

export type FlowNode = { id: string; type: "block"; position: { x: number; y: number }; data: BlockData }
export type FlowEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  label?: string
  data: EdgeData
}

export const INDENT = 44
export const BLOCK_WIDTH = 780
const GAP = 14

const WEIGHTING = {
  equal: "Split equally",
  specified: "Shares set by you",
  "inverse-volatility": "Steadier gets more",
} as const

const WEIGHT_TYPE = {
  equal: "Equal weight",
  specified: "Set weights",
  "inverse-volatility": "Inverse volatility",
} as const

const percent = (share: number) => `${Math.round(share * 100)}%`
const points = (share: number) => Math.round(share * 1000) / 10

const defined = <T extends object>(spec: T): T =>
  Object.fromEntries(Object.entries(spec).filter(([, value]) => value !== undefined)) as T

const BAR = 52
const LINE_LETTERS = 90
const TAGS_PER_ROW = 8

const EDITABLE_TAGS_PER_ROW = 6
const EDITABLE_EXTRA_TAGS = 2

const heightOf = ({ title, detail, chips }: Omit<BlockData, "path" | "spec">, roomy = false) => {
  const base = BAR + (Math.ceil((title.length * 1.2 + (detail?.length ?? 0)) / LINE_LETTERS) - 1) * 18
  if (!chips) return base
  if (!roomy) return base + 17 + Math.ceil(chips.length / TAGS_PER_ROW) * 26
  const rows = Math.ceil((chips.length + EDITABLE_EXTRA_TAGS) / EDITABLE_TAGS_PER_ROW)
  return base + 21 + rows * 34 + (rows - 1) * 8
}

type GraphView = {
  editable?: boolean
  tidy?: boolean
  folded?: ReadonlySet<string>
  separateRebalance?: boolean
}

type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[]; size: { width: number; height: number } }

const onlyStocks = (node: Node) => node.type === "group" && node.children.every((child) => child.node.type === "asset")

const blocksIn = (node: Node): number => {
  switch (node.type) {
    case "group":
      return 1 + node.children.reduce((sum, { node: child }) => sum + blocksIn(child), 0)
    case "if":
      return 1 + blocksIn(node.then) + blocksIn(node.else)
    case "rebalance":
      return 1 + blocksIn(node.child)
    default:
      return 1
  }
}

export function foldablePaths(strategy: Strategy, { tidy }: GraphView = {}): string[] {
  const paths: string[] = []
  const walk = (node: Node, path: string) => {
    if (node.type === "group" && !(tidy && onlyStocks(node))) {
      paths.push(path)
      node.children.forEach(({ node: child }, i) => walk(child, `${path}.${i}`))
    }
    if (node.type === "if") {
      paths.push(path)
      walk(node.then, `${path}.then`)
      walk(node.else, `${path}.else`)
    }
    if (node.type === "rebalance") {
      paths.push(path)
      walk(node.child, `${path}.child`)
    }
  }
  walk(strategy.root, "root")
  return paths
}

const rebalanceDisplay = (node: Extract<Node, { type: "rebalance" }>) => {
  const points = Math.round(node.drift * 100)
  return {
    block: "rebalance" as const,
    title: "Rebalance",
    detail: `Back to target past ${points} ${points === 1 ? "point" : "points"}, checked ${node.every}`,
    spec: { type: "rebalance" as const, drift: node.drift, every: node.every },
  }
}

export function toGraph(strategy: Strategy, view: GraphView = {}): FlowGraph {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  let cursor = 0
  let widest = 0

  const place = (id: string, path: string, depth: number, display: Omit<BlockData, "path">): string => {
    const x = depth * INDENT
    nodes.push({ id, type: "block", position: { x, y: cursor }, data: { ...display, path } })
    cursor +=
      heightOf(display, view.editable && display.block === "filter") +
      (view.editable && display.spec.type === "if" && !display.folded ? editorHeight(display.spec.condition) : 0) +
      GAP
    widest = Math.max(widest, x + BLOCK_WIDTH)
    return id
  }

  const add = (node: Node, path: string, depth: number): string => {
    switch (node.type) {
      case "asset":
        return place(path, path, depth, {
          block: "asset",
          title: node.symbol,
          detail:
            node.side === "short"
              ? "Short, through a perp"
              : node.via === "perp"
                ? "Hold, through a perp"
                : "Buy and hold",
          spec: defined({ type: "asset" as const, symbol: node.symbol, side: node.side, via: node.via }),
        })

      case "cash":
        return place(path, path, depth, {
          block: "cash",
          title: "Cash",
          detail: "Wait in USDC",
          spec: { type: "cash" },
        })

      case "filter": {
        const { type, pick, count, by, from, weighting, days } = node
        return place(path, path, depth, {
          block: "filter",
          title: `${pick === "top" ? "Best" : "Worst"} ${count} by ${describeIndicator(by)}`,
          detail: weighting === "inverse-volatility" ? "Steadier gets more" : "Held equally",
          weightType: WEIGHT_TYPE[weighting ?? "equal"],
          chips: from.map((symbol) => ({ symbol })),
          spec: defined({ type, pick, count, by, from, weighting, days }),
        })
      }

      case "group": {
        const total = node.children.reduce((sum, { weight }) => sum + Math.max(weight ?? 0, 0), 0)
        const spec = defined({ type: "group" as const, name: node.name, weighting: node.weighting, days: node.days })
        const display = {
          block: "group" as const,
          title: node.name ?? "Group",
          detail: WEIGHTING[node.weighting],
          weightType: WEIGHT_TYPE[node.weighting],
          spec,
        }
        const share = (weight?: number) =>
          node.weighting === "specified" && total > 0 ? percent(Math.max(weight ?? 0, 0) / total) : undefined
        const sharePoints = (weight?: number) =>
          node.weighting === "specified" && total > 0 ? points(Math.max(weight ?? 0, 0) / total) : undefined

        if (view.tidy && onlyStocks(node)) {
          return place(path, path, depth, {
            ...display,
            chips: node.children.map(({ node: child, weight }) => ({
              symbol: child.type === "asset" ? child.symbol : "",
              note: share(weight),
              percent: sharePoints(weight),
            })),
          })
        }
        if (view.folded?.has(path)) {
          return place(path, path, depth, {
            ...display,
            foldable: true,
            folded: true,
            hidden: node.children.reduce((sum, { node: child }) => sum + blocksIn(child), 0),
          })
        }

        const id = place(path, path, depth, { ...display, foldable: true })
        node.children.forEach(({ node: child, weight }, order) => {
          const childId = add(child, `${path}.${order}`, depth + 1)
          edges.push({
            id: `${id}>${childId}`,
            source: id,
            target: childId,
            label: share(weight),
            data: defined({ order, weight, share: sharePoints(weight) }),
          })
        })
        return id
      }

      case "rebalance": {
        const display = rebalanceDisplay(node)
        if (view.folded?.has(path)) {
          return place(path, path, depth, { ...display, foldable: true, folded: true, hidden: blocksIn(node) - 1 })
        }
        const id = place(path, path, depth, { ...display, foldable: true })
        const inside = add(node.child, `${path}.child`, depth + 1)
        edges.push({ id: `${id}>${inside}`, source: id, target: inside, data: { order: 0 } })
        return id
      }

      case "if": {
        const display = {
          block: "if" as const,
          title: "If",
          detail: describeCondition(node.condition),
          spec: { type: "if" as const, condition: node.condition },
        }
        if (view.folded?.has(path)) {
          return place(path, path, depth, { ...display, foldable: true, folded: true, hidden: blocksIn(node) - 1 })
        }
        const id = place(path, path, depth, { ...display, foldable: true })
        const yes = add(node.then, `${path}.then`, depth + 1)
        const no = add(node.else, `${path}.else`, depth + 1)
        edges.push(
          { id: `${id}>${yes}`, source: id, target: yes, sourceHandle: "then", label: "Then", data: { order: 0 } },
          { id: `${id}>${no}`, source: id, target: no, sourceHandle: "else", label: "Else", data: { order: 1 } }
        )
        return id
      }
    }
  }

  const start = place("start", "", 0, {
    block: "start",
    title: strategy.name,
    detail: `Looks again ${strategy.schedule}`,
    spec: { type: "start", name: strategy.name, schedule: strategy.schedule },
  })
  if (view.separateRebalance && strategy.root.type === "rebalance") {
    const inside = add(strategy.root.child, "root.child", 1)
    edges.push({ id: `${start}>${inside}`, source: start, target: inside, data: { order: 0 } })
    const apart = place("root", "root", 1, rebalanceDisplay(strategy.root))
    edges.push({ id: `${start}>${apart}`, source: start, target: apart, data: { order: 1 } })
    return { nodes, edges, size: { width: widest, height: Math.max(cursor - GAP, 0) } }
  }
  const root = add(strategy.root, "root", 1)
  edges.push({ id: `${start}>${root}`, source: start, target: root, data: { order: 0 } })

  return { nodes, edges, size: { width: widest, height: Math.max(cursor - GAP, 0) } }
}
