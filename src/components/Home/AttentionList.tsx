import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import { ATTENTION_ICON } from "@/constants/home"
import { pluralize } from "@/lib/format"
import type { AttentionItem } from "@/lib/home/types"

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length) return null

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Needs you" meta={pluralize(items.length, "item")} />
      <Card>
        {items.map(({ id, tone, title, detail, action }) => (
          <CardRow key={id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
            <IconTile icon={ATTENTION_ICON[tone]} tone={tone} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-ink-400 text-sm">{detail}</span>
            </div>
            <AppLink
              route={action.route}
              className={buttonVariants({ intent: "outline", size: "md", className: "min-h-10 w-full sm:w-auto" })}
            >
              {action.label}
            </AppLink>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
