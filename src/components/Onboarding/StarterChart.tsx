import { useId } from "react"

const WIDTH = 300
const HEIGHT = 90
const PAD = 6

// A year of a backtest as a line, green where it is above where it started and red where it is below
export function StarterChart({ series }: { series: number[] }) {
  const id = useId()
  const min = Math.min(...series)
  const range = Math.max(...series) - min || 1
  const y = (value: number) => PAD + (1 - (value - min) / range) * (HEIGHT - PAD * 2)
  const points = series.map((value, i) => `${(i / (series.length - 1)) * WIDTH},${y(value)}`).join(" ")
  const base = y(series[0] ?? 0)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="h-full w-full">
      <defs>
        <clipPath id={`${id}-up`}>
          <rect x="0" y="0" width={WIDTH} height={base} />
        </clipPath>
        <clipPath id={`${id}-down`}>
          <rect x="0" y={base} width={WIDTH} height={HEIGHT - base} />
        </clipPath>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${HEIGHT} ${points} ${WIDTH},${HEIGHT}`} fill={`url(#${id}-fill)`} />
      <line x1="0" x2={WIDTH} y1={base} y2={base} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 4" />
      {[
        ["up", "#15803d"],
        ["down", "#dc2626"],
      ].map(([side, stroke]) => (
        <polyline
          key={side}
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${id}-${side})`}
        />
      ))}
    </svg>
  )
}
