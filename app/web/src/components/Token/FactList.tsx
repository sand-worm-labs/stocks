import type { ReactNode } from "react"

import { Card, CardRow } from "@/components/ui/card"

type Fact = {
  label: string
  value: ReactNode
  icon?: ReactNode
}

export function FactList({ title, rows }: { title: string; rows: Fact[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{title}</h2>
      <Card>
        {rows.map(({ label, value, icon }) => (
          <CardRow key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-ink-400 flex flex-none items-center gap-2.5">
              {icon && <span className="flex size-5 flex-none items-center justify-center">{icon}</span>}
              {label}
            </span>
            <span className="min-w-0 text-right font-medium break-words">{value}</span>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
