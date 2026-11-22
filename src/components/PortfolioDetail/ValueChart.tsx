"use client"

import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts"

import { ChartFrame } from "@/components/Charts/ChartFrame"
import { ChartTooltip } from "@/components/Charts/ChartTooltip"
import { ResponsiveChart } from "@/components/Charts/ResponsiveChart"
import { CHART_ANIMATION, CHART_COLORS } from "@/constants/chart"
import { formatAmount, formatSignedAmount } from "@/lib/format"
import type { ValuePoint } from "@/lib/portfolios/performance"

const GRADIENT_ID = "portfolio-value-fill"

const dayOf = (label: string) => label.split(",")[0] ?? label

// One tick for each day, where it first appears, so a day is never named twice
const dayTicks = (points: ValuePoint[]) =>
  points
    .filter(({ label }, i) => i === 0 || dayOf(label) !== dayOf(points[i - 1]?.label ?? ""))
    .map(({ label }) => label)

// The portfolio's value over the week, with the S&P 500 held to the same start so the two can be compared
export function ValueChart({ points }: { points: ValuePoint[] }) {
  return (
    <ChartFrame height={220} label="The value of the portfolio over the last week, against the S&P 500">
      {(animate) => (
        <ResponsiveChart>
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              ticks={dayTicks(points)}
              tickFormatter={dayOf}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              domain={[(min: number) => Math.floor(min - 2), (max: number) => Math.ceil(max + 2)]}
              tickFormatter={(value: number) => String(Math.round(value))}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <Tooltip
              animationDuration={120}
              cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as ValuePoint | undefined
                if (!active || !point) return null
                return (
                  <ChartTooltip
                    title={point.label}
                    rows={[
                      { label: "Portfolio", value: `${formatAmount(point.value)} USDC`, color: CHART_COLORS.primary },
                      {
                        label: "S&P 500",
                        value: `${formatAmount(point.benchmark)} USDC`,
                        color: CHART_COLORS.muted,
                        dashed: true,
                      },
                    ]}
                    footer={`${formatSignedAmount(point.value - point.benchmark)} USDC against the S&P`}
                  />
                )
              }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="none"
              fill={`url(#${GRADIENT_ID})`}
              activeDot={false}
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
            <Line
              dataKey="value"
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
