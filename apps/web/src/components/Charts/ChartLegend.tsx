type LegendItem = { label: string; color: string; dashed?: boolean }

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="text-ink-400 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map(({ label, color, dashed }) => (
        <li key={label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-0 w-4 border-t-2"
            style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }}
          />
          {label}
        </li>
      ))}
    </ul>
  )
}
