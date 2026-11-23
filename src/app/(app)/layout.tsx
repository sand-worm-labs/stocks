import type { ReactNode } from "react"

import { LiveMarketProvider } from "@/components/Markets/LiveMarket"
import { PriceTicker } from "@/components/Markets/PriceTicker"
import { WelcomeDialog } from "@/components/Onboarding/WelcomeDialog"
import { AppShell } from "@/components/Shell/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { getActivity } from "@/lib/activity/source"
import { getAllPoolQuotes } from "@/lib/markets/pools"
import { getBaseTokens } from "@/lib/markets/tokens"
import { notificationsOf } from "@/lib/notifications/notifications"
import { getNotificationState } from "@/lib/notifications/source"
import { getSession } from "@/lib/session/source"

const TICKER_TOKENS = 30

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, tokens, activity, notificationState] = await Promise.all([
    getSession(),
    getBaseTokens(),
    getActivity(),
    getNotificationState(),
  ])
  const pools = await getAllPoolQuotes(tokens.map(({ address }) => address))

  return (
    <LiveMarketProvider initialPools={pools}>
      <AppShell
        session={session}
        notifications={notificationsOf(activity)}
        notificationState={notificationState}
        ticker={
          <PriceTicker
            tokens={tokens.slice(0, TICKER_TOKENS).map(({ id, address, symbol, image, price, change24h }) => ({
              id,
              address,
              symbol,
              image,
              price,
              change24h,
            }))}
          />
        }
      >
        {children}
      </AppShell>
      <WelcomeDialog initiallyOpen={session.welcomePending} />
      <Toaster />
    </LiveMarketProvider>
  )
}
