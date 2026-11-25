"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import type { ReactNode } from "react"

type TooltipProps = {
  title: string
  side?: "top" | "right" | "bottom" | "left"
  wide?: boolean
  children: ReactNode
}

export function Tooltip({ title, side = "bottom", wide, children }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={`font-body pointer-events-none z-50 rounded-md bg-black px-2.5 py-1 text-center text-xs text-white ${wide ? "max-w-64" : "max-w-36"}`}
          >
            {title}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
