import type { Condition, Node, Schedule, Side, Strategy, Via, Weighting } from "./types"

// Changing a strategy by hand: adding a block into a group, taking one out. Each returns a new strategy and leaves the old one
// as it was. A block is found by its path, the way the canvas names it: "root", then a step for each level in, a number for the
// nth thing in a group or "then" / "else" for a side of an if.

const steps = (path: string) => path.split(".").slice(1)

function update(node: Node, path: string[], change: (node: Node) => Node): Node {
  const [step, ...rest] = path
  if (step === undefined) return change(node)
  if (node.type === "group" && /^\d+$/.test(step)) {
    const index = Number(step)
    return {
      ...node,
      children: node.children.map((child, i) =>
        i === index ? { ...child, node: update(child.node, rest, change) } : child
      ),
    }
  }
  if (node.type === "rebalance" && step === "child") return { ...node, child: update(node.child, rest, change) }
  if (node.type === "if" && step === "then") return { ...node, then: update(node.then, rest, change) }
  if (node.type === "if" && step === "else") return { ...node, else: update(node.else, rest, change) }
  return node
}

// A block put last in the group at `path`. A group that splits by the shares it was given gives it a share like the others'
// average, so it neither disappears beside weights of 70 and 30 nor crowds out weights of 0.7 and 0.3.
export function addChild(strategy: Strategy, path: string, child: Node): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => {
      if (node.type !== "group") return node
      const given = node.children.map(({ weight }) => weight ?? 0).filter((weight) => weight > 0)
      const average = given.length ? given.reduce((sum, weight) => sum + weight, 0) / given.length : 1
      const added = node.weighting === "specified" ? { node: child, weight: average } : { node: child }
      return { ...node, children: [...node.children, added] }
    }),
  }
}

// The share, as a percentage, that the `index`th thing in the group at `path` should get. The group splits by the shares it was
// given, so the others are scaled to fill what is left (or, if they had nothing, split it equally), and every share is kept as a
// percentage that adds up to a hundred.
export function setShare(strategy: Strategy, path: string, index: number, percent: number): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => {
      if (node.type !== "group" || node.weighting !== "specified" || !node.children[index]) return node
      const count = node.children.length
      const given = node.children.map(({ weight }) => Math.max(weight ?? 0, 0))
      const sum = given.reduce((total, weight) => total + weight, 0)
      const now = given.map((weight) => (sum > 0 ? weight / sum : 1 / count))

      const chosen = count === 1 ? 1 : Math.min(Math.max(Number.isFinite(percent) ? percent : 0, 0), 100) / 100
      const others = now.reduce((total, share, i) => (i === index ? total : total + share), 0)
      const shares = now.map((share, i) =>
        i === index ? chosen : others > 0 ? (share * (1 - chosen)) / others : (1 - chosen) / (count - 1)
      )
      return {
        ...node,
        children: node.children.map((child, i) => ({
          ...child,
          weight: Math.round((shares[i] ?? 0) * 10000) / 100,
        })),
      }
    }),
  }
}

// The condition of the if at `path`, as a whole new one
export function setCondition(strategy: Strategy, path: string, condition: Condition): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => (node.type === "if" ? { ...node, condition } : node)),
  }
}

// How the stock at `path` is held: long or short, spot or through a perp. A short can only be through a perp, so shorting a stock
// makes it one; a long held as the token itself says nothing, which is how it is by default.
export function setAsset(strategy: Strategy, path: string, change: { side?: Side; via?: Via }): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => {
      if (node.type !== "asset") return node
      const side = change.side ?? node.side ?? "long"
      const via = side === "short" ? "perp" : (change.via ?? node.via ?? "spot")
      return {
        type: "asset",
        symbol: node.symbol,
        ...(side === "short" && { side }),
        ...(via === "perp" && { via }),
      }
    }),
  }
}

export type FilterBlock = Extract<Node, { type: "filter" }>
export type FilterChange = Partial<Pick<FilterBlock, "pick" | "count" | "by" | "from" | "weighting">>

// A filter changed in any of the things it says: best or worst, how many, by what, from which stocks, and how what it picks is
// weighted. How many is kept a whole number from one up, and the stocks to choose from never run out.
export function setFilter(strategy: Strategy, path: string, change: FilterChange): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => {
      if (node.type !== "filter") return node
      const next = { ...node, ...change }
      if (change.count !== undefined) next.count = Math.max(1, Math.round(change.count) || 1)
      if (change.from !== undefined && !change.from.length) next.from = node.from
      return next
    }),
  }
}

// How far a stock may drift from its share before a rebalance trades it back, and how often it looks, for the rebalance at `path`.
// The drift is a fraction of the portfolio, kept above nothing and no more than half.
export function setRebalance(strategy: Strategy, path: string, change: { drift?: number; every?: Schedule }): Strategy {
  return {
    ...strategy,
    root: update(strategy.root, steps(path), (node) => {
      if (node.type !== "rebalance") return node
      const drift = change.drift === undefined ? node.drift : Math.min(Math.max(change.drift, 0.01), 0.5)
      return { ...node, drift, every: change.every ?? node.every }
    }),
  }
}

// Whether the block at `path` can be taken out: it is one of several in a group, since a group is never left empty
export function canRemove(strategy: Strategy, path: string): boolean {
  const way = steps(path)
  const last = way.pop()
  if (last === undefined || !/^\d+$/.test(last)) return false
  let found = false
  update(strategy.root, way, (node) => {
    found = node.type === "group" && node.children.length > 1
    return node
  })
  return found
}

export function removeAt(strategy: Strategy, path: string): Strategy {
  if (!canRemove(strategy, path)) return strategy
  const way = steps(path)
  const index = Number(way.pop())
  return {
    ...strategy,
    root: update(strategy.root, way, (node) =>
      node.type === "group" ? { ...node, children: node.children.filter((_, i) => i !== index) } : node
    ),
  }
}

const readingsOf = (condition: Condition): string[] => {
  if ("all" in condition) return condition.all.flatMap(readingsOf)
  if ("any" in condition) return condition.any.flatMap(readingsOf)
  const { left, right } = condition
  return "symbol" in right ? [left.symbol, right.symbol] : [left.symbol]
}

// Every stock a strategy mentions, first seen first
export function symbolsIn(strategy: Strategy): string[] {
  const found = new Set<string>()
  const walk = (node: Node) => {
    switch (node.type) {
      case "asset":
        found.add(node.symbol)
        break
      case "group":
        node.children.forEach(({ node: child }) => walk(child))
        break
      case "if":
        readingsOf(node.condition).forEach((symbol) => found.add(symbol))
        walk(node.then)
        walk(node.else)
        break
      case "filter":
        node.from.forEach((symbol) => found.add(symbol))
        break
      case "rebalance":
        walk(node.child)
        break
    }
  }
  walk(strategy.root)
  return [...found]
}

// What can be added, by what it asks for beyond its kind
export type NewBlock =
  | { kind: "asset"; symbol: string }
  | { kind: "cash" }
  | { kind: "group" }
  | { kind: "weight"; weighting: Weighting }
  | { kind: "if" }
  | { kind: "any-all"; match: "all" | "any" }
  | { kind: "filter" }
  | { kind: "rebalance" }

// Kinds that need a stock to read from, and so cannot be made when there is none
export const NEEDS_STOCK: NewBlock["kind"][] = ["if", "any-all", "filter"]

// A block as it starts out, ready to be changed: a decision reads the first of `symbols` (the stocks the strategy already
// uses, then others), and a group starts with cash in it, since a group is never empty.
export function newBlock(block: NewBlock, symbols: string[]): Node | undefined {
  const [symbol] = symbols
  const waiting = { node: { type: "cash" } as Node }

  switch (block.kind) {
    case "asset":
      return { type: "asset", symbol: block.symbol }
    case "cash":
      return { type: "cash" }
    case "group":
      return { type: "group", weighting: "equal", children: [waiting] }
    case "weight":
      return {
        type: "group",
        weighting: block.weighting,
        children: [block.weighting === "specified" ? { ...waiting, weight: 1 } : waiting],
      }
    // Keeps an equal group of the first few stocks on target, or cash when there are none
    case "rebalance": {
      const held = symbols.slice(0, 3).map((held): { node: Node } => ({ node: { type: "asset", symbol: held } }))
      return {
        type: "rebalance",
        drift: 0.02,
        every: "monthly",
        child: { type: "group", weighting: "equal", children: held.length ? held : [waiting] },
      }
    }
  }

  if (!symbol) return undefined
  const above: Condition = {
    left: { symbol, indicator: { kind: "price" } },
    op: ">",
    right: { symbol, indicator: { kind: "sma", days: 50 } },
  }

  switch (block.kind) {
    case "if":
      return { type: "if", condition: above, then: { type: "asset", symbol }, else: { type: "cash" } }
    case "any-all": {
      const rsi: Condition = {
        left: { symbol, indicator: { kind: "rsi", days: 14 } },
        op: "<",
        right: { value: block.match === "all" ? 70 : 30 },
      }
      return {
        type: "if",
        condition: block.match === "all" ? { all: [above, rsi] } : { any: [above, rsi] },
        then: { type: "asset", symbol },
        else: { type: "cash" },
      }
    }
    case "filter": {
      const from = symbols.slice(0, 5)
      return {
        type: "filter",
        pick: "top",
        count: Math.min(3, from.length),
        by: { kind: "return", days: 30 },
        from,
        weighting: "equal",
      }
    }
  }
}
