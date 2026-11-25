"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef } from "react"
import { toast } from "sonner"

import { POLL_MS } from "@/constants/components/research/research-watcher"
import { RESEARCH_EVENT } from "@/constants/research"

type Strategy = { id: string; name: string; stage: "researching" | "ready" }

export function ResearchWatcher() {
  const router = useRouter()
  const path = usePathname()

  // Said when a report is ready, by whatever is looking: it sees the page the person is on now, not the one they were on when the
  // looking began. Kept in a ref that is brought up to date after each render, so the looking itself never has to start over.
  const tell = useRef((_: Strategy) => {})
  useLayoutEffect(() => {
    tell.current = ({ id, name }: Strategy) => {
      const href = `/strategies/${id}`
      if (path !== href) {
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
    }
  })

  useEffect(() => {
    let researching = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | undefined

    const look = async () => {
      clearTimeout(timer)
      try {
        const response = await fetch("/api/strategies/research", { cache: "no-store" })
        if (!response.ok) return
        const { strategies } = (await response.json()) as { strategies: Strategy[] }

        for (const strategy of strategies) {
          if (strategy.stage === "ready" && researching.has(strategy.id)) tell.current(strategy)
        }
        researching = new Set(strategies.filter(({ stage }) => stage === "researching").map(({ id }) => id))
        if (researching.size) timer = setTimeout(look, POLL_MS)
      } catch {}
    }

    void look()
    window.addEventListener(RESEARCH_EVENT, look)
    return () => {
      window.removeEventListener(RESEARCH_EVENT, look)
      clearTimeout(timer)
    }
  }, [])

  return null
}
