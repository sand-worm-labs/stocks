"use client"

import { useEffect, useState } from "react"

import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"
import { env } from "env.mjs"

// The same key as the main app's, so a browser that has answered there has answered here too, where they share a site
const CONSENT_KEY = "sandworm_cookie_consent"
// A beat after the page opens, so the notice doesn't land on top of the first paint
const SHOW_AFTER_MS = 600
// As long as the exit animation
const LEAVE_MS = 300

type Choice = "accepted" | "declined"

// Storage can be shut off (a private window, a browser setting), and asking it then throws. Without it the notice is
// asked again on the next visit, which is the honest outcome.
const readChoice = () => {
  try {
    return localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

const saveChoice = (choice: Choice) => {
  try {
    localStorage.setItem(CONSENT_KEY, choice)
  } catch {
    // Kept for this visit only
  }
}

const ACCEPT = buttonVariants({ intent: "dark", size: "compact", className: "w-full text-[13px] font-medium" })
const DECLINE = buttonVariants({ intent: "outline", size: "compact", className: "w-full text-[13px] font-medium" })

// The notice about cookies, in the corner until it is answered. The choice is kept in the browser. Nothing reads it yet
// (the main app doesn't either): it is there for whatever is switched on later that needs a yes.
export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // A page framed by another app (an embed) asks nothing of its own
    if (window.self !== window.top) return
    if (readChoice() !== null) return

    const timer = setTimeout(() => setIsVisible(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLeaving) return

    const timer = setTimeout(() => setIsVisible(false), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [isLeaving])

  const answer = (choice: Choice) => {
    saveChoice(choice)
    setIsLeaving(true)
  }

  if (!isVisible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      // Above the bar of sections that sits along the bottom of a phone, in the corner everywhere else
      className={cn(
        "bg-block-surface border-border-secondary dark:border-border-tertiary font-body fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 z-50 flex w-auto max-w-[720px] flex-col gap-4 rounded-2xl border px-5 py-3 shadow-[0_4px_4px_0_#73768726] sm:right-6 sm:left-auto sm:w-[400px] md:bottom-6",
        isLeaving ? "animate-cookie-down" : "animate-cookie-up"
      )}
    >
      <h2 className="text-ink-100 mt-1 font-medium">Cookie Settings</h2>
      <p className="text-ink-500 m-0 flex-1 pr-2 text-[13px] leading-relaxed">
        We use essential functionality cookies to make the site work. If you accept, we may also use cookies to enhance
        your experience, measure ad performance and analyze.
        <a
          href={`${env.NEXT_PUBLIC_LANDING_URL}/privacy`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent dark:text-primary ml-1 font-medium whitespace-nowrap hover:underline"
        >
          Learn more
        </a>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => answer("accepted")} className={ACCEPT}>
          Accept
        </button>
        <button type="button" onClick={() => answer("declined")} className={DECLINE}>
          Decline
        </button>
      </div>
    </div>
  )
}
