import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: ReactNode
  titleClassName?: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, titleClassName, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className={cn("text-2xl font-medium md:text-[32px] md:leading-10", titleClassName)}>{title}</h1>
        {description && <div className="text-ink-400 flex flex-wrap items-center gap-2 text-sm">{description}</div>}
      </div>
      {actions}
    </div>
  )
}
