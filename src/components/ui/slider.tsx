"use client"

import * as SliderPrimitive from "@radix-ui/react-slider"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex h-5 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="bg-ink-300/25 relative h-1.5 grow overflow-hidden rounded-full dark:bg-white/15">
        <SliderPrimitive.Range className="bg-primary absolute h-full" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="border-primary bg-block-surface focus-visible:ring-primary/40 block size-4 rounded-full border-2 shadow transition-shadow outline-none focus-visible:ring-4" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
