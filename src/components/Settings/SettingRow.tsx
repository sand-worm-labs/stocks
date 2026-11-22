import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { CardRow } from "@/components/ui/card"

type SettingRowProps = {
  title: string
  description: ReactNode
  // A short tag beside the title, e.g. the rule it sets
  tag?: string
  // The control on the right: a switch, a menu, a button
  children: ReactNode
}

export function SettingRow({ title, description, tag, children }: SettingRowProps) {
  return (
    <CardRow className="flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 font-medium">
          {title}
          {tag && <Badge>{tag}</Badge>}
        </span>
        <span className="text-ink-400 text-sm">{description}</span>
      </div>
      {children}
    </CardRow>
  )
}
