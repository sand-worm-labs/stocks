import type { ReactNode } from "react"

import { LiveMarketProvider } from "@/components/Markets/LiveMarket"
import { PriceTicker } from "@/components/Markets/PriceTicker"
import { WelcomeDialog } from "@/components/Onboarding/WelcomeDialog"
import { AppShell } from "@/components/Shell/AppShell"
import { Toaster } from "@/components/ui/sonner"
import { getAllPoolQuotes } from "@/lib/markets/pools"
import { getBaseTokens } from "@/lib/markets/tokens"
import { getSession } from "@/lib/session/source"

const TICKER_TOKENS = 30

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [session, tokens] = await Promise.all([getSession(), getBaseTokens()])
  const pools = await getAllPoolQuotes(tokens.map(({ address }) => address))

  return (
    <LiveMarketProvider initialPools={pools}>
      <AppShell
        session={session}
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
