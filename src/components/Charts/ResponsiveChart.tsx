"use client"

import type { ComponentProps } from "react"
import { ResponsiveContainer } from "recharts"

export function ResponsiveChart(props: ComponentProps<typeof ResponsiveContainer>) {
  return <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 280 }} {...props} />
}
