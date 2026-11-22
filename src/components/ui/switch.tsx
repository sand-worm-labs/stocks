"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "focus-visible:ring-primary/50 inline-flex h-6 w-11 flex-none items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-tertiary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
