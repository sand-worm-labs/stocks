import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="dark:border-border-tertiary dark:bg-block-surface w-full overflow-x-auto dark:rounded-xl dark:border"
    >
      <table data-slot="table" className={cn("min-w-full border-collapse text-left", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-border-secondary dark:border-border-tertiary border-b", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn("text-ink-400 p-4 text-left text-xs font-bold whitespace-nowrap uppercase", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-border-secondary dark:border-border-tertiary border-b transition-colors last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td data-slot="table-cell" className={cn("p-4 align-middle text-sm whitespace-nowrap", className)} {...props} />
  )
}

export { Table, TableCell, TableHead, TableHeader, TableRow }
