"use client"

import { useState } from "react"
import { PiInfo } from "react-icons/pi"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// The little (i) beside a number or a heading: what it means, in plain words. It opens on hover or focus where there is a pointer, and on
// tap everywhere else.
export function InfoTip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={`What ${label} means`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-ink-300 hover:text-ink-100 print:hidden focus-visible:text-ink-100 inline-flex size-4 flex-none items-center justify-center rounded-full transition-colors"
      >
        <PiInfo size={14} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="max-w-[17rem] p-3 text-[13px] leading-5"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
