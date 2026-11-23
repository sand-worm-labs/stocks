import { PiSpinnerGap } from "react-icons/pi"

import { cn } from "@/lib/utils"

type ChartLoaderProps = { visible?: boolean; className?: string }

const GRIDLINES = [0, 1, 2, 3]

// What a chart's space shows until the chart is drawn: faint gridlines, a line breathing where the real one will be, and a
// spinner. It is on the page from the first paint, so the box is never blank, and fades away when the chart arrives.
export function ChartLoader({ visible = true, className }: ChartLoaderProps) {
  return (
    <div
      role={visible ? "status" : undefined}
      aria-hidden={!visible}
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className="absolute inset-0 flex flex-col justify-between py-3">
        {GRIDLINES.map((line) => (
          <span key={line} className="border-border-secondary dark:border-border-tertiary border-t border-dashed" />
        ))}
      </div>
      <svg
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="text-ink-400/40 absolute inset-x-0 top-1/4 h-1/2 w-full motion-safe:animate-pulse"
      >
        <path
          d="M0 44 C 18 40, 26 20, 48 26 S 78 46, 100 32 S 138 8, 160 18 S 190 12, 200 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="bg-block-surface text-ink-400 relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-sm">
        <PiSpinnerGap aria-hidden="true" size={14} className="motion-safe:animate-spin" />
        Loading chart
      </span>
    </div>
  )
}
