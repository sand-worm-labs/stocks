import { AppLink } from "@/components/AppLink/AppLink"
import { BaseMark } from "@/components/BaseMark/BaseMark"
import { buttonVariants } from "@/components/Button/Button"
import { Badge } from "@/components/ui/badge"
import { CardRow } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import { ACTIVITY_KIND, BASE_SEPOLIA_EXPLORER_URL } from "@/constants/activity"
import type { Activity } from "@/lib/activity/types"
import { formatTime } from "@/lib/dates"

export function ActivityRow({ activity: { kind, title, detail, at, action, rule, onchain } }: { activity: Activity }) {
  const { icon, tone } = ACTIVITY_KIND[kind]

  return (
    <CardRow className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
      <IconTile icon={icon} tone={tone} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-ink-400 text-sm">{detail}</span>
      </div>
      {rule && <Badge>§ {rule}</Badge>}
      {action && (
        <AppLink
          route={action.route}
          slug={action.slug}
          className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
        >
          {action.label}
        </AppLink>
      )}
      {onchain && (
        <a
          href={BASE_SEPOLIA_EXPLORER_URL}
          title="Base Sepolia explorer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-400 hover:text-ink-100 inline-flex items-center gap-1.5 text-xs transition-colors"
        >
          <BaseMark size={14} />
          tx
        </a>
      )}
      <time dateTime={at} className="text-ink-400 w-12 flex-none text-right text-xs tabular-nums">
        {formatTime(at)}
      </time>
    </CardRow>
  )
}
