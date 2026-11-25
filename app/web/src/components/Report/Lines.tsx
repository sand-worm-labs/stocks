import { cn } from "@/lib/utils"

export type Line = { name: string; points: { label: string; value: number }[] }

const WIDTH = 600
const HEIGHT = 200

export type LineFormat = "multiple" | "percent" | "currency"

export const formatLevel = (value: number, format: LineFormat) =>
  format === "percent"
    ? `${value.toFixed(0)}%`
    : format === "currency"
      ? `${Math.round(value).toLocaleString("en-US")} USDC`
      : `${value.toFixed(2)}×`

// Lines over time, drawn plainly, with a level worth watching as a dashed line. The first line is the strategy's, in the brand colour; the
// other is what it is compared with, in grey.
export function Lines({ title, format, series, mark }: { title: string; format: LineFormat; series: Line[]; mark?: { label: string; value: number } }) {
  const values = [...series.flatMap(({ points }) => points.map(({ value }) => value)), ...(mark ? [mark.value] : [])]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const span = high - low || 1
  const y = (value: number) => HEIGHT - ((value - low) / span) * (HEIGHT - 12) - 6
  const x = (i: number, count: number) => (i / Math.max(count - 1, 1)) * WIDTH
  const first = series[0]?.points

  return (
    <div className="flex flex-col gap-2">
      <ul className="text-ink-400 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map(({ name }, i) => (
          <li key={name} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-0.5 w-4 rounded-full", i === 0 ? "bg-mark" : "bg-ink-300")} />
            {name}
          </li>
        ))}
        {mark && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="border-ink-300 w-4 border-t border-dashed" />
            {mark.label}
          </li>
        )}
      </ul>
      <svg role="img" aria-label={title} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
        {mark && (
          <line
            x1={0}
            x2={WIDTH}
            y1={y(mark.value)}
            y2={y(mark.value)}
            className="text-ink-300"
            stroke="currentColor"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {series.map(({ name, points }, i) => (
          <polyline
            key={name}
            points={points.map(({ value }, at) => `${x(at, points.length)},${y(value)}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={i === 0 ? "text-mark" : "text-ink-300"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="text-ink-400 flex justify-between text-xs tabular-nums">
        <span>{first?.at(0)?.label}</span>
        <span>
          {formatLevel(low, format)} to {formatLevel(high, format)}
        </span>
        <span>{first?.at(-1)?.label}</span>
      </div>
    </div>
  )
}
