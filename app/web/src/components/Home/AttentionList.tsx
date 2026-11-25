import { PiArrowRight } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { PortfolioIcon } from "@/components/Portfolios/PortfolioIcon"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { SHOWN } from "@/constants/components/home/attention-list"
import { pluralize } from "@/lib/format"
import type { AttentionItem } from "@/types/home"

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length) return null
  const more = items.length - SHOWN

  return (
    <section className="flex flex-col gap-3 select-none">
      <SectionHeader title="Continue" meta={pluralize(items.length, "draft")} />
      <Card>
        {items.slice(0, SHOWN).map(({ id, title, detail, action }) => (
          <CardRow key={id}>
            <AppLink
              route={action.route}
              slug={action.slug}
              className="hover:bg-hover-bg/60 group flex items-center gap-3 p-4 transition-colors"
            >
              <PortfolioIcon name={title} className="size-9" size={18} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{title}</span>
                <span className="text-ink-400 truncate text-sm">{detail}</span>
              </div>
              <span className="flex flex-none items-center gap-1 text-sm font-medium">
                {action.label}
                <PiArrowRight
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </AppLink>
          </CardRow>
        ))}
        {more > 0 && (
          <CardRow>
            <AppLink
              route="portfolios"
              className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg/60 block p-4 text-sm font-medium transition-colors"
            >
              {pluralize(more, "more draft")} →
            </AppLink>
          </CardRow>
        )}
      </Card>
    </section>
  )
}
