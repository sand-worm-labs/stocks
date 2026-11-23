import type { ReactNode } from "react"

import { FancyIcon } from "@/components/ui/fancy-icon"
import type { FancyIconName } from "@/constants/fancy-icons"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: ReactNode
  titleClassName?: string
  description?: ReactNode
  actions?: ReactNode
  // The designed icon shown before the title
  icon?: FancyIconName
}

export function PageHeader({ title, titleClassName, description, actions, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3.5">
        {icon && <FancyIcon name={icon} size={48} />}
        <div className="flex flex-col gap-1">
          <h1 className={cn("text-2xl font-medium md:text-[32px] md:leading-10", titleClassName)}>{title}</h1>
          {description && <div className="text-ink-400 flex flex-wrap items-center gap-2 text-sm">{description}</div>}
        </div>
      </div>
      {actions}
    </div>
  )
}
