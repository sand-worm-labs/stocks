"use client"

import "@xyflow/react/dist/style.css"

import { Background, BackgroundVariant, Controls, type Edge, type Node, type NodeTypes, ReactFlow } from "@xyflow/react"
import { useTheme } from "next-themes"

type FlowCanvasProps = {
  nodes: Node[]
  edges: Edge[]
  nodeTypes: NodeTypes
  height: number
  // Told which block the pointer is over, and when it leaves
  onHover?: (id?: string) => void
}

// The frame every diagram here is drawn in: a still, dotted board that is looked at and not edited, with zoom buttons. It
// fits what is drawn to its width, and never scrolls the page out from under the pointer.
export function FlowCanvas({ nodes, edges, nodeTypes, height, onHover }: FlowCanvasProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div
      style={{ height }}
      className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-2xl border"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // This version of React Flow dresses itself for the dark by a class, not a colorMode prop
        className={resolvedTheme === "dark" ? "dark" : undefined}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
        minZoom={0.4}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        preventScrolling={false}
        onNodeMouseEnter={(_, node) => onHover?.(node.id)}
        onNodeMouseLeave={() => onHover?.(undefined)}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
