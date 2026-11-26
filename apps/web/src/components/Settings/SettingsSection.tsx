import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type SettingsSectionProps = { title: string; description: string; children: ReactNode }

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-ink-400 text-sm">{description}</p>
      </div>
      <Card>{children}</Card>
    </section>
  )
}
