import { describeCondition, describeIndicator } from "../describe"
import type { Condition, Indicator, Node, Schedule, Strategy, Weighting } from "../types"

// A strategy drawn as boxes and lines, for React Flow. The strategy is the one thing that is kept: the boxes are made from it,
// and it can be made again from them. Each box carries everything it is (`spec`) and each line where it sits among its
// brothers, so nothing is lost either way, and where a box is drawn is worked out from the strategy's shape.

export type BlockKind = "start" | "asset" | "cash" | "group" | "if" | "filter"

// What a block is, apart from what it leads to: this is what is saved
export type BlockSpec =
  | { type: "start"; name: string; schedule: Schedule }
  | { type: "asset"; symbol: string }
  | { type: "cash" }
  | { type: "group"; name?: string; weighting: Weighting; days?: number }
  | { type: "if"; condition: Condition }
  | {
      type: "filter"
      pick: "top" | "bottom"
      count: number
      by: Indicator
      from: string[]
      weighting?: "equal" | "inverse-volatility"
      days?: number
    }

// A stock a block draws from, shown as a small tag, with something said beside it such as its share
export type Chip = { symbol: string; note?: string }

export type BlockData = {
  block: BlockKind
  title: string
  detail?: string
  chips?: Chip[]
  // The path to this block in the strategy, which is how an edit finds it
  path: string
  spec: BlockSpec
  // Only in a drawing that can be folded: whether this block has blocks inside it to fold, whether they are folded, and how
  // many there are
  foldable?: boolean
  folded?: boolean
  hidden?: number
}

export type EdgeData = {
  // Its place among the lines from the same block
  order: number
  // What a group was told to give what this leads to, as it was given
  weight?: number
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

// How far a block is set in for each level it is nested, and how wide a block is: a bar across the page, as Composer draws it
export const INDENT = 44
export const BLOCK_WIDTH = 780
// Space left between one block and the next down the page
const GAP = 14

const WEIGHTING = {
  equal: "Split equally",
  specified: "Split by weight",
  "inverse-volatility": "Steadier gets more",
} as const

const percent = (share: number) => `${Math.round(share * 100)}%`

// A spec with only what is there, so a block with no name has no `name` rather than a name of nothing
const defined = <T extends object>(spec: T): T =>
  Object.fromEntries(Object.entries(spec).filter(([, value]) => value !== undefined)) as T

// How tall a block is drawn, worked out from how much it says: a block is one line, its name and what it decides read across,
// and runs onto another only when it says more than fits. Tags go in a row under it.
const BAR = 52
const LINE_LETTERS = 90
const TAGS_PER_ROW = 8

const heightOf = ({ title, detail, chips }: Omit<BlockData, "path" | "spec">) =>
  BAR +
  (Math.ceil((title.length * 1.2 + (detail?.length ?? 0)) / LINE_LETTERS) - 1) * 18 +
  (chips ? 17 + Math.ceil(chips.length / TAGS_PER_ROW) * 26 : 0)

export type GraphView = {
  // A group of nothing but stocks is one block with the stocks as tags, instead of a block for each
  tidy?: boolean
  // Blocks, by path, that are folded shut: what is inside them is left out
  folded?: ReadonlySet<string>
}

export type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[]; size: { width: number; height: number } }

const onlyStocks = (node: Node) => node.type === "group" && node.children.every((child) => child.node.type === "asset")

// How many blocks a node is made of, itself included
const blocksIn = (node: Node): number => {
  switch (node.type) {
    case "group":
      return 1 + node.children.reduce((sum, { node: child }) => sum + blocksIn(child), 0)
    case "if":
      return 1 + blocksIn(node.then) + blocksIn(node.else)
    default:
      return 1
  }
}

// The paths of the blocks that can be folded in a view: the ones with blocks inside them that are drawn
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
  }
  walk(strategy.root, "root")
  return paths
}

// Straight down, the way Composer reads: a block, then what is in it a step further in, one after another, so the whole
// strategy is one column that is read from the top
export function toGraph(strategy: Strategy, view: GraphView = {}): FlowGraph {
  const nodes: FlowNode[] = []
  const edges: FlowEdge[] = []
  let cursor = 0
  let widest = 0

  // `id` names the block on the canvas, and `path` is the way to it in the strategy
  const place = (id: string, path: string, depth: number, display: Omit<BlockData, "path">): string => {
    const x = depth * INDENT
    nodes.push({ id, type: "block", position: { x, y: cursor }, data: { ...display, path } })
    cursor += heightOf(display) + GAP
    widest = Math.max(widest, x + BLOCK_WIDTH)
    return id
  }

  const add = (node: Node, path: string, depth: number): string => {
    switch (node.type) {
      case "asset":
        return place(path, path, depth, {
          block: "asset",
          title: node.symbol,
          detail: "Buy and hold",
          spec: { type: "asset", symbol: node.symbol },
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
          spec,
        }
        const share = (weight?: number) =>
          node.weighting === "specified" && total > 0 ? percent(Math.max(weight ?? 0, 0) / total) : undefined

        if (view.tidy && onlyStocks(node)) {
          return place(path, path, depth, {
            ...display,
            chips: node.children.map(({ node: child, weight }) => ({
              symbol: child.type === "asset" ? child.symbol : "",
              note: share(weight),
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
            data: defined({ order, weight }),
          })
        })
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
  const root = add(strategy.root, "root", 1)
  edges.push({ id: `${start}>${root}`, source: start, target: root, data: { order: 0 } })

  return { nodes, edges, size: { width: widest, height: Math.max(cursor - GAP, 0) } }
}
