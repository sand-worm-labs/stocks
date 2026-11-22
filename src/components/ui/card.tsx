import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "border-border-secondary bg-block-surface dark:border-border-tertiary rounded-2xl border",
        className
      )}
      {...props}
    />
  )
}

function CardRow({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-row"
      className={cn("border-border-secondary dark:border-border-tertiary border-t first:border-t-0", className)}
      {...props}
    />
  )
}

export { Card, CardRow }
