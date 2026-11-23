import type { ReactNode } from "react"

import { NotificationsProvider } from "@/components/Notifications/NotificationsProvider"
import { NO_NOTIFICATION_STATE, type Notification, type NotificationState } from "@/lib/notifications/notifications"
import type { Session } from "@/lib/session/types"

import { AppHeader } from "./AppHeader"
import { BottomNav } from "./BottomNav"

type AppShellProps = {
  session: Session
  children: ReactNode
  ticker?: ReactNode
  notifications?: Notification[]
  notificationState?: NotificationState
}

const NO_NOTIFICATIONS: Notification[] = []

export function AppShell({
  session,
  children,
  ticker,
  notifications = NO_NOTIFICATIONS,
  notificationState = NO_NOTIFICATION_STATE,
}: AppShellProps) {
  return (
    <NotificationsProvider notifications={notifications} initialState={notificationState} now={session.now}>
      <div className="font-body flex min-h-dvh flex-col">
        <div className="sticky top-0 z-40 select-none">
          <AppHeader session={session} />
          {ticker}
        </div>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-10 md:pt-8 md:pb-16">
          {children}
        </main>
        <BottomNav />
      </div>
    </NotificationsProvider>
  )
}
