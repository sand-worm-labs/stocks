"use client"

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts"

import { ChartFrame } from "@/components/Charts/ChartFrame"
import { ChartTooltip } from "@/components/Charts/ChartTooltip"
import { ResponsiveChart } from "@/components/Charts/ResponsiveChart"
import { CHART_ANIMATION, CHART_COLORS } from "@/constants/chart"
import { formatPercent } from "@/lib/format"
import type { DrawdownRow } from "@/lib/report/performance"

const GRADIENT_ID = "drawdown-fill"

type DrawdownChartProps = { rows: DrawdownRow[]; panic: number }

// How far below its peak the portfolio was, month by month, and the loss its owner said they'd panic at
export function DrawdownChart({ rows, panic }: DrawdownChartProps) {
  const floor = Math.floor(Math.min(panic, ...rows.map(({ portfolio }) => portfolio)) * 10) / 10

  return (
    <ChartFrame height={240} label="How far below its peak the portfolio was, against the loss you said you'd panic at">
      {(animate) => (
        <ResponsiveChart>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.negative} stopOpacity={0} />
                <stop offset="100%" stopColor={CHART_COLORS.negative} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={56}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              domain={[floor, 0]}
              tickCount={Math.round(-floor * 10) + 1}
              tickFormatter={(value: number) => formatPercent(value)}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <ReferenceLine
              y={panic}
              stroke={CHART_COLORS.warning}
              strokeDasharray="5 4"
              label={{
                value: `You'd panic at ${formatPercent(panic)}`,
                position: "insideBottomRight",
                fill: CHART_COLORS.warning,
                fontSize: 11,
              }}
            />
            <Tooltip
              animationDuration={120}
              cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as DrawdownRow | undefined
                if (!active || !row) return null
                return (
                  <ChartTooltip
                    title={row.label}
                    rows={[
                      { label: "This portfolio", value: formatPercent(row.portfolio), color: CHART_COLORS.negative },
                      {
                        label: "S&P 500",
                        value: formatPercent(row.benchmark),
                        color: CHART_COLORS.muted,
                        dashed: true,
                      },
                    ]}
                    footer={row.portfolio < panic ? "Past the loss you'd panic at" : undefined}
                  />
                )
              }}
            />
            <Area
              dataKey="portfolio"
              type="monotone"
              stroke={CHART_COLORS.negative}
              strokeWidth={2}
              fill={`url(#${GRADIENT_ID})`}
              activeDot={{ r: 4, fill: CHART_COLORS.negative, strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            />
            <Line
              dataKey="benchmark"
              type="monotone"
              stroke={CHART_COLORS.muted}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, fill: CHART_COLORS.muted, strokeWidth: 0 }}
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
