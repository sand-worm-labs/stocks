"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"

import { routeHref } from "@/config/routes"
import { createStrategy, errorMessage } from "@/lib/strategies/client"

// Makes a strategy from an idea and opens it. It can only be started once at a time: from the press until the page has changed,
// `busy` is true and a second press does nothing, so one idea can't make two strategies.
export function useStartStrategy() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const start = useCallback(
    async (brief: string) => {
      if (started.current) return
      started.current = true
      setBusy(true)
      try {
        const { id } = await createStrategy(brief)
        router.push(routeHref("portfolio", undefined, id) ?? "/strategies")
      } catch (error) {
        toast.error("Couldn't start your strategy", { description: errorMessage(error) })
        started.current = false
        setBusy(false)
      }
    },
    [router]
  )

  return { start, busy }
}
