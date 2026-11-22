"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
// Radix gives a trigger an id that can differ between the server and the browser, which is harmless
function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger suppressHydrationWarning {...props} />
}
const DialogClose = DialogPrimitive.Close

function DialogContent({ className, children, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="animate-overlay fixed inset-0 z-50 bg-[rgb(17_24_39/0.42)]"
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className={cn(
            "font-body animate-dialog bg-block-surface pointer-events-auto flex max-h-full w-full max-w-[600px] flex-col gap-4 overflow-y-auto rounded-t-2xl p-5 shadow-[0_24px_60px_rgba(0,0,0,0.25)] outline-none sm:rounded-2xl sm:p-6",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-xl font-medium", className)} {...props} />
}

function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-ink-400 text-sm", className)}
      {...props}
    />
  )
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger }
