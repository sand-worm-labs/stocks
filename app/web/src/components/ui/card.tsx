import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// A raised card is a report cell: the lilac border and soft shadow of a block in the Sandworm editor
function Card({ className, raised = false, ...props }: ComponentProps<"section"> & { raised?: boolean }) {
  return (
    <section
      data-slot="card"
      className={cn(
        "bg-block-surface dark:border-border-tertiary rounded-2xl border",
        raised ? "border-hover-border block-shadow-soft" : "border-border-secondary",
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
