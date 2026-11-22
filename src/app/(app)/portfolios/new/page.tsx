import type { Metadata } from "next"
import { PiInfo } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { CheckRow } from "@/components/Check/CheckRow"
import { Tooltip } from "@/components/Tooltip/Tooltip"
import { Card } from "@/components/ui/card"
import { WalletCheckRow } from "@/components/Wallet/WalletCheckRow"
import { FAUCET_URL } from "@/constants/settings"
import { getSession } from "@/lib/session/source"
import { getSettings } from "@/lib/settings/source"

export const metadata: Metadata = { title: "Can you trade?" }

export default async function CheckPage() {
  const [{ network, region }, { testUsdc }] = await Promise.all([getSession(), getSettings()])

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6 md:py-14">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-ink-400 text-sm">Before your first portfolio</span>
        <h1 className="flex items-center gap-2 text-2xl font-medium md:text-[32px] md:leading-10">
          Can you trade tokenized stocks?
          <Tooltip title="Three quick checks, so you don't write a brief you can't act on." side="top" wide>
            <button
              type="button"
              aria-label="Why these checks"
              className="text-ink-300 hover:text-ink-100 transition-colors"
            >
              <PiInfo size={18} aria-hidden="true" />
            </button>
          </Tooltip>
        </h1>
      </div>

      <Card>
        <CheckRow
          status="pass"
          title={`Where you live: ${region}`}
          description="Tokenized stocks are offered outside the US. You confirm this once."
          action={
            <button
              type="button"
              className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
            >
              Change
            </button>
          }
        />
        <WalletCheckRow chain={network.chain} />
        <CheckRow
          status="warn"
          title={`USDC to spend: ${testUsdc}`}
          description="Get free test USDC to try a real buy, or start with paper trading."
          action={
            <a
              href={FAUCET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent dark:text-primary text-sm font-medium hover:underline"
            >
              Get test USDC ↗
            </a>
          }
        />
      </Card>

      <div className="flex flex-wrap justify-center gap-2">
        <AppLink route="brief" className={buttonVariants({ intent: "dark", size: "compact" })}>
          Continue with paper trading
        </AppLink>
        <AppLink route="brief" className={buttonVariants({ intent: "outline", size: "compact" })}>
          I&apos;ve added USDC
        </AppLink>
      </div>
      <p className="text-ink-400 text-center text-sm">
        Paper trading uses live prices with no money. You can switch to your wallet at the buy step.
      </p>
    </div>
  )
}
