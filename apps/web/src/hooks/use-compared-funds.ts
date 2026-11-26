import { useEffect, useRef, useState } from "react"

import { CHIP_MS, defaultPicked, type Slot, toggled } from "@/lib/charts/trading"

export type Chip = Slot & { open: boolean; immediate?: boolean }

export function useComparedFunds(ids: string[]) {
  const [picked, setPicked] = useState<Slot[]>(() => defaultPicked(ids))
  const [chips, setChips] = useState<Chip[]>(() =>
    defaultPicked(ids).map((slot) => ({ ...slot, open: true, immediate: true }))
  )
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const toggle = (id: string) => {
    const { next, gone, added } = toggled(picked, id)
    setPicked(next)
    setChips((current) => {
      const out = current.map((chip) => (gone.some((slot) => slot.id === chip.id) ? { ...chip, open: false } : chip))
      for (const slot of added) {
        const at = out.findIndex((chip) => chip.id === slot.id)
        const found = out[at]
        if (found) out[at] = { ...found, color: slot.color, open: true }
        else out.push({ ...slot, open: true })
      }
      return out
    })
    if (gone.length) {
      const timer = setTimeout(() => {
        timers.current.delete(timer)
        setChips((current) => current.filter((chip) => chip.open || !gone.some((slot) => slot.id === chip.id)))
      }, CHIP_MS + 60)
      timers.current.add(timer)
    }
  }

  return { picked, chips, toggle }
}
