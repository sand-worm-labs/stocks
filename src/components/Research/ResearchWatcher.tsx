"use client"

import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"

import { RESEARCH_EVENT } from "@/constants/research"

type Strategy = { id: string; name: string; stage: "researching" | "ready" }

// How often it looks while something is being researched
const POLL_MS = 5000

// Tells a person when research they started has finished, wherever they are in the app. It looks only while something is being
// researched, and says so once for each: a message on the page, a notification on the device if they allowed one and are not looking
// at the tab, and the bell and Activity are brought up to date. Someone who is on the strategy's own page is not told, because it is
// already showing them. Someone who has closed the app finds it in the bell and in My strategies when they are back.
export function ResearchWatcher() {
  const router = useRouter()
  const path = usePathname()
  const pathname = useRef(path)
  pathname.current = path
  const researching = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const tell = useCallback(
    ({ id, name }: Strategy) => {
      const href = `/strategies/${id}`
      if (pathname.current !== href) {
        toast.success("Your report is ready", {
          description: name,
          duration: 15_000,
          action: { label: "View results", onClick: () => router.push(href) },
        })
      }
      if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        const note = new Notification("Your report is ready", { body: name })
        note.onclick = () => {
          window.focus()
          router.push(href)
        }
      }
      router.refresh()
    },
    [router]
  )

  const look = useCallback(async () => {
    clearTimeout(timer.current)
    try {
      const response = await fetch("/api/strategies/research", { cache: "no-store" })
      if (!response.ok) return
      const { strategies } = (await response.json()) as { strategies: Strategy[] }

      for (const strategy of strategies) {
        if (strategy.stage === "ready" && researching.current.has(strategy.id)) tell(strategy)
      }
      researching.current = new Set(strategies.filter(({ stage }) => stage === "researching").map(({ id }) => id))
      if (researching.current.size) timer.current = setTimeout(look, POLL_MS)
    } catch {
      // The connection dropped: it looks again at the next research, or when the page is opened
    }
  }, [tell])

  useEffect(() => {
    void look()
    window.addEventListener(RESEARCH_EVENT, look)
    return () => {
      window.removeEventListener(RESEARCH_EVENT, look)
      clearTimeout(timer.current)
    }
  }, [look])

  return null
}
