import type { Metadata } from "next"
import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { CheckRow } from "@/components/Check/CheckRow"
import { Card } from "@/components/ui/card"
import { FAUCET_URL } from "@/constants/settings"
import { shortenAddress } from "@/lib/format"
import { getSession } from "@/lib/session/source"
import { getSettings } from "@/lib/settings/source"

export const metadata: Metadata = { title: "Can you trade?" }

export default async function CheckPage() {
  const [{ wallet, network, region }, { testUsdc }] = await Promise.all([getSession(), getSettings()])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-ink-400 text-sm">Before your first portfolio</span>
        <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">Can you trade tokenized stocks?</h1>
        <p className="text-ink-400 text-sm">
          Three quick checks, so you don&apos;t write a brief you can&apos;t act on.
        </p>
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
        <CheckRow
          status="pass"
          title="Wallet connected"
          description={`${shortenAddress(wallet)} on ${network.chain} (test network).`}
          action={
            <button
              type="button"
              className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
            >
              Switch
            </button>
          }
        />
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

      <div className="flex flex-wrap gap-2">
        <AppLink route="brief" className={buttonVariants({ intent: "dark", size: "compact" })}>
          Continue with paper trading
        </AppLink>
        <AppLink route="brief" className={buttonVariants({ intent: "outline", size: "compact" })}>
          I&apos;ve added USDC
        </AppLink>
      </div>
      <p className="text-ink-400 text-sm">
        Paper trading uses live prices with no money. You can switch to your wallet at the buy step.
      </p>
    </div>
  )
}
