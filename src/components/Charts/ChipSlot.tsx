import { type ReactNode, useEffect, useState } from "react"

import { EASE } from "@/constants/components/charts/chip-slot"
import { CHIP_MS } from "@/lib/charts/trading"

type ChipSlotProps = {
  open: boolean
  immediate?: boolean
  reduced: boolean
  children: ReactNode
}

export function ChipSlot({ open, immediate, reduced, children }: ChipSlotProps) {
  const [arrived, setArrived] = useState(Boolean(immediate))

  useEffect(() => {
    if (arrived) return
    // Two frames, so the closed state has been drawn before it is opened
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArrived(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [arrived])

  const shown = arrived && open
  return (
    <div
      style={{
        gridTemplateColumns: shown ? "1fr" : "0fr",
        opacity: shown ? 1 : 0,
        transition: reduced ? "none" : `grid-template-columns ${CHIP_MS}ms ${EASE}, opacity ${CHIP_MS}ms ease`,
      }}
      className="grid"
    >
      <div className="min-w-0 overflow-hidden">
        <div className="pr-2">{children}</div>
      </div>
    </div>
  )
}
