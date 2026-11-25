"use client"

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"

import { ChartFrame } from "@/components/Charts/ChartFrame"
import { ChartTooltip } from "@/components/Charts/ChartTooltip"
import { ResponsiveChart } from "@/components/Charts/ResponsiveChart"
import { CHART_ANIMATION, CHART_COLORS } from "@/constants/chart"
import { MONTH_TICKS } from "@/constants/components/report/charts/fan-chart"
import { formatPercent } from "@/lib/format"
import type { FanPoint } from "@/types/report"

type Row = FanPoint & { range: [number, number] }

const percent = (value: number) => formatPercent(value, { signed: true })

export function FanChart({ fan }: { fan: FanPoint[] }) {
  const rows: Row[] = fan.map((point) => ({ ...point, range: [point.low, point.high] }))

  return (
    <ChartFrame
      height={240}
      label="The range of outcomes over the next year: the middle outcome and the band 9 in 10 fall in"
    >
      {(animate) => (
        <ResponsiveChart>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
            <XAxis
              dataKey="month"
              ticks={MONTH_TICKS}
              tickLine={false}
              axisLine={false}
              tickFormatter={(month: number) => (month === 0 ? "Now" : `${month} mo`)}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <YAxis
              width={48}
              domain={[(min: number) => Math.floor(min * 4) / 4, (max: number) => Math.ceil(max * 4) / 4]}
              tickCount={6}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => percent(value)}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <ReferenceLine y={0} stroke={CHART_COLORS.text} strokeOpacity={0.4} />
            <Tooltip
              animationDuration={120}
              cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as Row | undefined
                if (!active || !row) return null
                return (
                  <ChartTooltip
                    title={row.month === 0 ? "Now" : `In ${row.month} months`}
                    rows={[
                      { label: "Good year (1 in 20)", value: percent(row.high), color: CHART_COLORS.positive },
                      { label: "Middle", value: percent(row.median), color: CHART_COLORS.primary },
                      { label: "Bad year (1 in 20)", value: percent(row.low), color: CHART_COLORS.negative },
                    ]}
                  />
                )
              }}
            />
            <Area
              dataKey="range"
              type="monotone"
              stroke="none"
              fill={CHART_COLORS.primary}
              fillOpacity={0.18}
              activeDot={false}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
            <Line
              dataKey="median"
              type="monotone"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: CHART_COLORS.primary, strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
          </ComposedChart>
        </ResponsiveChart>
      )}
    </ChartFrame>
  )
}
