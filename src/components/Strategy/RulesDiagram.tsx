"use client"

import type { Edge } from "@xyflow/react"
import { useMemo } from "react"

import { toChecksGraph } from "@/lib/rules/flow"
import type { RuleReading } from "@/lib/rules/readings"

import { CheckNode } from "./CheckNode"
import { FlowCanvas } from "./FlowCanvas"

const NODE_TYPES = { check: CheckNode }
const MARGIN = 60

// How a trade is checked, straight down: what the strategy wants, each rule in turn, your OK, then the order. A rule that
// is broken holds the order back, and says so at the end.
export function RulesDiagram({ readings, strategyName }: { readings: RuleReading[]; strategyName: string }) {
  const graph = useMemo(() => toChecksGraph(readings, strategyName), [readings, strategyName])
  const edges: Edge[] = graph.edges.map((edge) => ({
    ...edge,
    type: "smoothstep",
    animated: true,
    style: { stroke: "var(--mark)", strokeWidth: 2 },
  }))

  return <FlowCanvas nodes={graph.nodes} edges={edges} nodeTypes={NODE_TYPES} height={graph.size.height + MARGIN} />
}
