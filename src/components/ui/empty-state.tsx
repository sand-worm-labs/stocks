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
  preview?: ReactNode
  className?: string
}

function EmptyState({ icon, title, description, primary, secondary, preview, className }: EmptyStateProps) {
  return (
    <Card
      data-slot="empty-state"
      className={cn(
        "relative flex flex-col items-center overflow-hidden px-6 pt-14 text-center",
        "bg-[radial-gradient(55%_60%_at_50%_0%,var(--mark-soft),transparent)]",
        preview ? "pb-0" : "pb-14",
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
      {preview && (
        <div aria-hidden="true" className="pointer-events-none mt-10 w-full max-w-xl select-none">
          {preview}
        </div>
      )}
    </Card>
  )
}

function Ghost({ className }: { className?: string }) {
  return <span className={cn("bg-hover-bg inline-block flex-none rounded-full dark:bg-white/10", className)} />
}

export { EmptyState, Ghost }
