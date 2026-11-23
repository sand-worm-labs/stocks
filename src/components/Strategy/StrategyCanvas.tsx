"use client"

import type { Edge, Node } from "@xyflow/react"
import { useMemo, useState } from "react"

import { buttonVariants } from "@/components/Button/Button"
import { foldablePaths, toGraph } from "@/lib/strategy/flow/graph"
import type { Strategy } from "@/lib/strategy/types"

import { BlockNode, type BlockNodeData } from "./BlockNode"
import { FlowCanvas } from "./FlowCanvas"

const NODE_TYPES = { block: BlockNode }
// Room above and below the column, and the tallest the canvas is made
const MARGIN = 80
const MAX_HEIGHT = 1600

// A strategy as blocks, read straight down. It is drawn from the strategy each time, so what is kept is only the strategy.
// Hovering a block lights the way to it and the way on from it, and dims the rest.
export function StrategyCanvas({ strategy }: { strategy: Strategy }) {
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const graph = useMemo(() => toGraph(strategy, { tidy: true, folded }), [strategy, folded])
  const foldable = useMemo(() => foldablePaths(strategy, { tidy: true }), [strategy])
  const fold = (path: string) =>
    setFolded((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  const [hovered, setHovered] = useState<string>()

  // A block is lit if it is the one hovered, on the way to it, or on the way on from it
  const lit = (id: string) =>
    !hovered ||
    hovered === "start" ||
    id === "start" ||
    id === hovered ||
    hovered.startsWith(`${id}.`) ||
    id.startsWith(`${hovered}.`)

  const nodes: Node<BlockNodeData, "block">[] = graph.nodes.map((node) => ({
    ...node,
    data: { ...node.data, onFold: () => fold(node.data.path) },
    style: { opacity: lit(node.id) ? 1 : 0.28, transition: "opacity 200ms" },
  }))
  const edges: Edge[] = graph.edges.map((edge) => {
    const color = edge.label === "Then" ? "#10b981" : edge.label === "Else" ? "#ef4444" : "var(--mark)"

    return {
      ...edge,
      type: "smoothstep",
      pathOptions: { borderRadius: 14 },
      animated: true,
      style: {
        stroke: color,
        strokeWidth: 2,
        opacity: lit(edge.source) && lit(edge.target) ? 1 : 0.2,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink-400 text-xs">
          Hover a block to follow its path. Use the arrows to fold what is inside.
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFolded(new Set(foldable.filter((path) => path !== "root")))}
            className={buttonVariants({ intent: "outline", size: "compact" })}
          >
            Fold all
          </button>
          <button
            type="button"
            onClick={() => setFolded(new Set())}
            className={buttonVariants({ intent: "outline", size: "compact" })}
          >
            Unfold all
          </button>
        </div>
      </div>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        height={Math.min(graph.size.height + MARGIN, MAX_HEIGHT)}
        onHover={setHovered}
      />
    </div>
  )
}
