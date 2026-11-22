"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PiChatTeardropText, PiCoins, PiLockKey, PiX } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { dismissWelcome } from "@/lib/onboarding/actions"
import { cn } from "@/lib/utils"

const POINTS = [
  {
    icon: PiChatTeardropText,
    title: "Say what you want",
    text: "Describe a goal and the agent researches it.",
  },
  {
    icon: PiLockKey,
    title: "Rules it can't break",
    text: "Caps and limits are locked. It won't break them.",
  },
  {
    icon: PiCoins,
    title: "Approve, then trade on Base",
    text: "Review it, then buy on Base with your USDC.",
  },
]

// Shown once, over the first page after the stepper: what can be done here, in three lines
export function WelcomeDialog({ initiallyOpen }: { initiallyOpen: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(initiallyOpen)

  const close = () => {
    setOpen(false)
    void dismissWelcome()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        aria-label="Welcome to Sandworm Stocks"
        aria-describedby={undefined}
        // Nothing is focused on opening, so the close button isn't ringed before anyone has touched anything
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[464px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[32px] p-0 sm:rounded-[32px] sm:p-0"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-60 bg-[radial-gradient(120%_100%_at_0%_0%,#bbf7d0_0%,transparent_55%),radial-gradient(90%_90%_at_100%_0%,#818cf8_0%,transparent_60%)] opacity-90 dark:opacity-40"
        />
        <div className="relative flex flex-col gap-6 p-8 pt-7">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <SandwormLogo size={26} />
              <span className="font-tertiary text-base font-medium uppercase">Sandworm</span>
            </span>
            <DialogClose
              aria-label="Close"
              className="text-ink-100 flex size-8 items-center justify-center rounded-full bg-white/60 transition-colors hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <PiX size={14} aria-hidden="true" />
            </DialogClose>
          </div>

          <div className="flex flex-col gap-1.5 pt-5">
            <DialogTitle className="text-[44px] leading-[48px] font-normal tracking-tight">
              Welcome to Sandworm Stocks
            </DialogTitle>
            <DialogDescription className="text-[15px] font-light">Here&apos;s what you can do here.</DialogDescription>
          </div>

          <ul className="flex flex-col gap-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span
                  aria-hidden="true"
                  className="bg-primary-tint-75 text-primary dark:bg-primary/15 flex size-10 flex-none items-center justify-center rounded-xl"
                >
                  <Icon size={18} />
                </span>
                <span className="flex flex-col">
                  <span className="text-base leading-5">{title}</span>
                  <span className="text-ink-400 text-sm leading-5">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              close()
              router.push("/portfolios/new/brief")
            }}
            className={cn(buttonVariants({ intent: "dark", size: "compact" }), "h-11 w-full text-[15px] font-normal")}
          >
            Get started
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
