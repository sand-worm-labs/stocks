"use client"

import type { ComponentProps } from "react"
import { ResponsiveContainer } from "recharts"

// A chart that fills the box it is in. The box sets the height, so nothing moves when the chart arrives.
export function ResponsiveChart(props: ComponentProps<typeof ResponsiveContainer>) {
  return <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }} {...props} />
}
