import type { ReactNode } from "react"

import type { Session } from "@/lib/session/types"

import { AppHeader } from "./AppHeader"
import { BottomNav } from "./BottomNav"

type AppShellProps = { session: Session; children: ReactNode; ticker?: ReactNode }

export function AppShell({ session, children, ticker }: AppShellProps) {
  return (
    <div className="font-body flex min-h-dvh flex-col">
      <div className="sticky top-0 z-40 select-none">
        <AppHeader session={session} />
        {ticker}
      </div>
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-10 md:pt-8 md:pb-16">
        {children}
      </main>
      <BottomNav unreadAlerts={session.unreadAlerts} />
    </div>
  )
}
