"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({ className, ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        sideOffset={6}
        className={cn(
          "bg-base-100 dark:bg-dropdown-bg border-border-tertiary font-body z-50 rounded-2xl border shadow-lg outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverContent, PopoverTrigger }
