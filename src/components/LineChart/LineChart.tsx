import { HEIGHT, WIDTH } from "@/constants/components/line-chart/line-chart"
import { cn } from "@/lib/utils"

type Line = { id: string; points: number[]; className: string; dashed?: boolean }

type LineChartProps = {
  lines: Line[]
  label: string
  className?: string
}

export function LineChart({ lines, label, className }: LineChartProps) {
  const all = lines.flatMap(({ points }) => points)
  const min = Math.min(...all)
  const range = Math.max(...all) - min || 1

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn("h-48 w-full overflow-visible", className)}
    >
      {lines.map(({ id, points, className, dashed }) => (
        <polyline
          key={id}
          points={points
            .map(
              (value, i) =>
                `${(i / Math.max(points.length - 1, 1)) * WIDTH},${HEIGHT - ((value - min) / range) * HEIGHT}`
            )
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={dashed ? "6 4" : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={className}
        />
      ))}
    </svg>
  )
}
