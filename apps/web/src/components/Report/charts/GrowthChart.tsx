"use client"

import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, Tooltip, XAxis, YAxis } from "recharts"

import { ChartFrame } from "@/components/Charts/ChartFrame"
import { ChartTooltip } from "@/components/Charts/ChartTooltip"
import { ResponsiveChart } from "@/components/Charts/ResponsiveChart"
import { CHART_ANIMATION, CHART_COLORS } from "@/constants/chart"
import { GRADIENT_ID } from "@/constants/components/report/charts/growth-chart"
import { formatAmount, formatSignedAmount } from "@/lib/format"
import type { GrowthRow } from "@/lib/report/performance"

export function GrowthChart({ rows }: { rows: GrowthRow[] }) {
  const held = rows.filter(({ held }) => held)
  const first = held[0]
  const last = rows.at(-1)

  return (
    <ChartFrame height={280} label="Value of 100 USDC in the strategy against the S&P 500 over three years">
      {(animate) => (
        <ResponsiveChart>
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 4" />
            {first && last && (
              <ReferenceArea
                x1={first.label}
                x2={last.label}
                fill={CHART_COLORS.primary}
                fillOpacity={0.08}
                label={{ value: "Out-of-sample", position: "insideTopLeft", fill: CHART_COLORS.text, fontSize: 12 }}
              />
            )}
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
              domain={[(min: number) => Math.floor(min * 2) / 2, (max: number) => Math.ceil(max * 2) / 2]}
              tickFormatter={(value: number) => `${value.toFixed(1)}×`}
              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
            />
            <Tooltip
              animationDuration={120}
              cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as GrowthRow | undefined
                if (!active || !row) return null
                return (
                  <ChartTooltip
                    title={row.held ? `${row.label} · out-of-sample` : row.label}
                    rows={[
                      {
                        label: "This strategy",
                        value: `${row.portfolio.toFixed(2)}× · ${formatAmount(row.portfolio * 100)} USDC`,
                        color: CHART_COLORS.primary,
                      },
                      {
                        label: "S&P 500",
                        value: `${row.benchmark.toFixed(2)}× · ${formatAmount(row.benchmark * 100)} USDC`,
                        color: CHART_COLORS.muted,
                        dashed: true,
                      },
                    ]}
                    footer={
                      <span
                        className={
                          row.portfolio >= row.benchmark
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-700 dark:text-red-400"
                        }
                      >
                        {formatSignedAmount((row.portfolio - row.benchmark) * 100)} USDC against the S&amp;P
                      </span>
                    }
                  />
                )
              }}
            />
            <Area
              dataKey="portfolio"
              type="monotone"
              stroke="none"
              fill={`url(#${GRADIENT_ID})`}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
              activeDot={false}
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
              dataKey="portfolio"
              type="monotone"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: "var(--background, #fff)", strokeWidth: 2 }}
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
