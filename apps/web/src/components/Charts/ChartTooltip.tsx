import type { ReactNode } from "react"

export type TooltipRow = { label: string; value: string; color: string; dashed?: boolean }

type ChartTooltipProps = { title: string; rows: TooltipRow[]; footer?: ReactNode }

export function ChartTooltip({ title, rows, footer }: ChartTooltipProps) {
  return (
    <div className="border-border-secondary bg-block-surface dark:border-border-tertiary min-w-44 rounded-xl border px-3 py-2.5 text-sm shadow-lg">
      <p className="text-ink-400 mb-1.5 text-xs">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map(({ label, value, color, dashed }) => (
          <li key={label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0 w-3 border-t-2"
                style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
              />
              {label}
            </span>
            <span className="font-medium tabular-nums">{value}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <div className="border-border-secondary dark:border-border-tertiary mt-2 border-t pt-2 text-xs">{footer}</div>
      )}
    </div>
  )
}
