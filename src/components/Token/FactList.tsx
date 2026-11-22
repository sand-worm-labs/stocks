import type { ReactNode } from "react"

import { Card, CardRow } from "@/components/ui/card"

// A card of labelled facts, one to a row
export function FactList({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{title}</h2>
      <Card>
        {rows.map(({ label, value }) => (
          <CardRow key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <span className="text-ink-400">{label}</span>
            <span className="min-w-0 text-right font-medium break-words">{value}</span>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
