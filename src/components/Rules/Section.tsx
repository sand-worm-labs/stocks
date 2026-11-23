import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type SectionProps = { title: string; description?: string; actions?: ReactNode; children: ReactNode }

// One part of the page: what it is called, a line on what it is for, and a way to look at it another way
export function Section({ title, description, actions, children }: SectionProps) {
  return (
    <Card className="flex flex-col gap-4 rounded-[14px] p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[19px] leading-tight font-medium">{title}</h2>
          {description && <p className="text-ink-400 text-sm">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  )
}
