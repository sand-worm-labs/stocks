import { HEIGHT } from "@/constants/components/sparkline/sparkline"
import { cn } from "@/lib/utils"

type SparklineProps = { series: number[]; className?: string }

export function Sparkline({ series, className }: SparklineProps) {
  if (series.length < 2) return null

  const min = Math.min(...series)
  const range = Math.max(...series) - min || 1
  const points = series
    .map((value, i) => `${(i / (series.length - 1)) * 100},${HEIGHT - ((value - min) / range) * HEIGHT}`)
    .join(" ")

  return (
    <svg
      viewBox={`0 0 100 ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-6 w-24 flex-none overflow-visible", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
