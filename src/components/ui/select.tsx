"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import type { ComponentProps } from "react"
import { PiCaretDown, PiCheck } from "react-icons/pi"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "border-border bg-inputBg text-ink-100 hover:border-primary focus-visible:ring-primary/50 dark:border-border-tertiary flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm transition-colors outline-none focus-visible:ring-2 dark:bg-transparent",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <PiCaretDown size={14} aria-hidden="true" className="text-ink-400" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={4}
        className={cn(
          "bg-dropdown-bg text-dropdown-text border-border-secondary dark:border-border-tertiary font-body z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border shadow-md",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="flex flex-col gap-0.5 p-1.5">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-hover-bg focus:border-hover-border dark:focus:bg-sidebar-hover relative flex cursor-pointer items-center rounded-[10px] border border-transparent py-2 pr-8 pl-3 text-sm transition-[background-color,border-color] duration-200 ease-out outline-none select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <PiCheck size={14} aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
