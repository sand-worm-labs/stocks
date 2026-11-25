import type { ReactNode } from "react"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { FancyIcon } from "@/components/ui/fancy-icon"
import type { EmptyAction } from "@/constants/empty-state"
import type { FancyIconName } from "@/constants/fancy-icons"
import { cn } from "@/lib/utils"

import { Card } from "./card"

type EmptyStateProps = {
  icon: FancyIconName
  title: string
  description: ReactNode
  primary?: EmptyAction
  secondary?: EmptyAction
  className?: string
}

function EmptyState({ icon, title, description, primary, secondary, className }: EmptyStateProps) {
  return (
    <Card
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center px-6 py-14 text-center",
        className
      )}
    >
      <FancyIcon name={icon} size={72} />
      <h2 className="mt-5 text-2xl font-medium tracking-tight">{title}</h2>
      <p className="text-ink-400 mt-2 max-w-md text-[15px] leading-6">{description}</p>
      {(primary || secondary) && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {primary && (
            <AppLink
              route={primary.route}
              className={cn(buttonVariants({ intent: "dark", size: "compact" }), "h-11 px-6 text-base")}
            >
              {primary.label}
            </AppLink>
          )}
          {secondary && (
            <AppLink
              route={secondary.route}
              className="text-ink-400 hover:text-ink-100 text-sm font-medium transition-colors"
            >
              {secondary.label}
            </AppLink>
          )}
        </div>
      )}
    </Card>
  )
}

export { EmptyState }
