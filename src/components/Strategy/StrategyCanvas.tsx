"use client"

import type { Edge, Node } from "@xyflow/react"
import { useMemo, useRef, useState } from "react"

import { CHECKS_ID, toChecks, toExits, toOrders } from "@/lib/rules/flow"
import type { RuleReading } from "@/lib/rules/readings"
import {
  addChild,
  canRemove,
  type FilterChange,
  removeAt,
  setAsset,
  setCondition,
  setFilter,
  setRebalance,
  setShare,
  symbolsIn,
} from "@/lib/strategy/edit"
import { toGraph } from "@/lib/strategy/flow/graph"
import type { Condition, Schedule, Side, Strategy, Via } from "@/lib/strategy/types"

import { AddBlockMenu } from "./AddBlockMenu"
import { BlockNode, type BlockNodeData, HoverContext, isLit } from "./BlockNode"
import { CheckNode } from "./CheckNode"
import { ChecksNode } from "./ChecksNode"
import { FlowCanvas } from "./FlowCanvas"

const NODE_TYPES = { block: BlockNode, check: CheckNode, checks: ChecksNode }
// Room above and below the column, and the tallest the canvas is made
const MARGIN = 80
const MAX_HEIGHT = 1600
// Space between the strategy and the rules under it
const GAP = 14

// A strategy as blocks, read straight down. It is drawn from the strategy each time, so what is kept is only the strategy.
// Hovering a block lights the way to it and the way on from it, and dims the rest. Given `onChange`, groups can be added to
// and what is in them taken out.
export function StrategyCanvas({
  strategy,
  onChange,
  symbols = [],
  readings = [],
}: {
  strategy: Strategy
  onChange?: (strategy: Strategy) => void
  // The rules, drawn as blocks under the strategy on the same board
  readings?: RuleReading[]
  // Every stock that can be added
  symbols?: string[]
}) {
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const editable = !!onChange
  const graph = useMemo(
    () => toGraph(strategy, { tidy: true, folded, editable, separateRebalance: true }),
    [strategy, folded, editable]
  )
  const fold = (path: string) =>
    setFolded((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  const [hovered, setHovered] = useState<string>()
  const seed = useMemo(() => [...new Set([...symbolsIn(strategy), ...symbols])].slice(0, 5), [strategy, symbols])

  // The nodes are made again only when the strategy or the folds change, never on hover. React Flow takes a new node object for
  // a block it has not measured, hides it until it has, and drops the lines to it meanwhile, which flickers the whole diagram.
  // Which blocks are dimmed is told to each block through `HoverContext` instead.
  const change = useRef(onChange)
  change.current = onChange
  // The rules come first, hung under the start; the strategy is moved down to make room for them, and the order goes out last
  const firstBelow = graph.nodes[1]?.position.y ?? 0
  const checks = useMemo(() => toChecks(readings, "start", firstBelow), [readings, firstBelow])
  const shift = checks.nodes.length ? checks.bottom + GAP - firstBelow : 0
  // The exits come after what the strategy decides, in a block of their own: they are watched on the whole portfolio, not checked on
  // each trade, and the order goes out last
  const exits = useMemo(
    () => toExits(readings, "start", graph.size.height + shift + GAP),
    [readings, graph.size.height, shift]
  )
  const orders = useMemo(() => toOrders(readings, "start", exits.bottom + GAP), [readings, exits.bottom])
  // Where a block sits in a group that splits by shares: that group, its place there, and the share it has now
  const share = (id: string) => {
    const edge = graph.edges.find(({ target }) => target === id)
    return edge?.data.share === undefined
      ? undefined
      : { parent: edge.source, index: edge.data.order, value: edge.data.share }
  }
  const blocks: Node<BlockNodeData, "block">[] = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        position: node.id === "start" ? node.position : { ...node.position, y: node.position.y + shift },
        data: {
          ...node.data,
          onFold: () => fold(node.data.path),
          ...(editable &&
            node.data.block === "group" &&
            !node.data.folded && {
              adder: (
                <AddBlockMenu
                  to={node.data.title}
                  seed={seed}
                  symbols={symbols}
                  onAdd={(block) => change.current?.(addChild(strategy, node.data.path, block))}
                />
              ),
            }),
          // A block in a group that splits by shares can have its share typed in, and so can the stocks shown as tags in one
          ...(editable &&
            share(node.id) && {
              share: share(node.id)?.value,
              onShare: (percent: number) => {
                const { parent, index } = share(node.id) ?? { parent: "", index: 0 }
                change.current?.(setShare(strategy, parent, index, percent))
              },
            }),
          ...(editable &&
            node.data.chips?.some(({ percent }) => percent !== undefined) && {
              onChipShare: (index: number, percent: number) =>
                change.current?.(setShare(strategy, node.data.path, index, percent)),
            }),
          // A filter has every part of what it says as a field
          ...(editable &&
            node.data.block === "filter" && {
              onFilter: (patch: FilterChange) => change.current?.(setFilter(strategy, node.data.path, patch)),
              choices: [...new Set([...symbols, ...symbolsIn(strategy)])],
            }),
          // A rebalance has how far a stock may drift, and how often it looks, as fields
          ...(editable &&
            node.data.block === "rebalance" && {
              onRebalance: (patch: { drift?: number; every?: Schedule }) =>
                change.current?.(setRebalance(strategy, node.data.path, patch)),
            }),
          // A stock can be held long or short, as the token or through a perp
          ...(editable &&
            node.data.block === "asset" && {
              onAsset: (held: { side?: Side; via?: Via }) => change.current?.(setAsset(strategy, node.data.path, held)),
            }),
          // An if has what it reads as rows that can be changed
          ...(editable &&
            node.data.block === "if" && {
              onCondition: (condition: Condition) =>
                change.current?.(setCondition(strategy, node.data.path, condition)),
              choices: [...new Set([...symbols, ...symbolsIn(strategy)])],
            }),
          ...(editable &&
            canRemove(strategy, node.data.path) && {
              onRemove: () => {
                // What is folded is found by where it sits, and what is after the one taken out moves up
                setFolded(new Set())
                change.current?.(removeAt(strategy, node.data.path))
              },
            }),
        },
      })),
    // `fold` only sets state, so it is the same every time
    [graph, strategy, editable, seed, symbols, shift]
  )
  const nodes: Node[] = [...blocks, ...checks.nodes, ...exits.nodes, orders.node]
  // With rules, the strategy follows them rather than the start: every trade passes them first, then the strategy decides
  const strategyEdges = graph.edges.map((edge) =>
    checks.nodes.length && edge.source === "start"
      ? { ...edge, id: `${CHECKS_ID}>${edge.target}`, source: CHECKS_ID }
      : edge
  )
  const edges: Edge[] = [
    ...strategyEdges,
    ...[...checks.edges, ...exits.edges, orders.edge].map(({ id, source, target }) => ({
      id,
      source,
      target,
      data: { order: 0 },
    })),
  ].map((edge) => {
    const color =
      "label" in edge && edge.label === "Then"
        ? "#10b981"
        : "label" in edge && edge.label === "Else"
          ? "#ef4444"
          : "var(--mark)"

    return {
      ...edge,
      type: "smoothstep",
      pathOptions: { borderRadius: 14 },
      animated: true,
      style: {
        stroke: color,
        strokeWidth: 2,
        opacity: isLit(edge.source, hovered) && isLit(edge.target, hovered) ? 1 : 0.2,
        transition: "opacity 200ms",
      },
      labelStyle: { fill: color, fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: "var(--color-block-surface)" },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 8,
    }
  })

  return (
    <div className="flex flex-col gap-3">
      <HoverContext value={hovered}>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          height={Math.min(orders.bottom + MARGIN, MAX_HEIGHT)}
          onHover={setHovered}
        />
      </HoverContext>
    </div>
  )
}
