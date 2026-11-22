import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import type { AgentBlock } from "@/lib/agent/types"

export function ActionsBlock({ block: { actions } }: { block: Extract<AgentBlock, { type: "actions" }> }) {
  return (
    <div data-block className="flex flex-wrap gap-2">
      {actions.map(({ label, route, slug, intent }) => (
        <AppLink
          key={label}
          route={route}
          slug={slug}
          className={buttonVariants({ intent, size: "compact", className: "data-item" })}
        >
          <span data-item>{label}</span>
        </AppLink>
      ))}
    </div>
  )
}
