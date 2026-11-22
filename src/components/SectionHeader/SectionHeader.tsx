import { AppLink } from "@/components/AppLink/AppLink"
import type { RouteId } from "@/config/routes"

type SectionHeaderProps = {
  title: string
  meta?: string
  link?: { route: RouteId; label: string }
}

export function SectionHeader({ title, meta, link }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-medium">{title}</h2>
      {meta && <span className="text-ink-400 text-sm">{meta}</span>}
      {link && (
        <AppLink route={link.route} className="text-ink-400 hover:text-ink-100 text-sm font-medium transition-colors">
          {link.label}
        </AppLink>
      )}
    </div>
  )
}
