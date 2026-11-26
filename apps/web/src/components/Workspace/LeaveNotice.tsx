"use client"

import { PiBellRinging, PiCheck } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { useNotificationPermission } from "@/hooks/use-notification-permission"

export function LeaveNotice() {
  const { permission, ask } = useNotificationPermission()

  return (
    <Card className="flex gap-3.5 p-4 md:p-5">
      <span
        aria-hidden="true"
        className="bg-hover-bg text-ink-200 flex size-10 flex-none items-center justify-center rounded-xl dark:bg-white/10"
      >
        <PiBellRinging size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">You don&apos;t have to wait here</p>
        <p className="text-ink-400 text-sm leading-5">
          Sandworm is doing this research and it can take a few minutes. Leave whenever you like. We&apos;ll tell you
          when your report is ready: here in the app, in the bell, and under Activity. It will be waiting in My
          strategies.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
          <AppLink route="portfolios" className={buttonVariants({ intent: "outline", size: "compact" })}>
            Go to my strategies
          </AppLink>
          {permission === "default" && (
            <button
              type="button"
              onClick={ask}
              className="text-accent dark:text-primary text-sm font-medium hover:underline"
            >
              Also notify me on this device
            </button>
          )}
          {permission === "granted" && (
            <span className="text-ink-400 flex items-center gap-1.5 text-sm">
              <PiCheck aria-hidden="true" size={14} className="text-emerald-600 dark:text-emerald-400" />
              You&apos;ll be notified on this device too
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
