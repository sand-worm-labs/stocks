"use client"

import { useDynamicContext } from "@dynamic-labs/sdk-react-core"

import { StatusMark } from "@/components/Check/CheckRow"
import { Card } from "@/components/ui/card"
import { useWalletEnabled } from "@/components/Wallet/WalletContext"
import { buildGettingStarted } from "@/lib/home/gettingStarted"
import { cn } from "@/lib/utils"

type Progress = { hasPortfolio: boolean; hasBought: boolean }

function Steps({ walletConnected, ...progress }: Progress & { walletConnected: boolean }) {
  const steps = buildGettingStarted({ walletConnected, ...progress })
  if (steps.every(({ done }) => done)) return null

  return (
    <Card className="bg-[radial-gradient(80%_55%_at_100%_30%,var(--mark-soft),transparent)] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Getting started</h2>
        <span className="text-ink-400 text-sm tabular-nums">
          {steps.filter(({ done }) => done).length} of {steps.length}
        </span>
      </div>
      <ol className="mt-4 flex flex-col">
        {steps.map(({ id, title, description, done, current }, index) => (
          <li key={id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-border-secondary dark:bg-border-tertiary absolute top-8 bottom-1 left-3.5 w-px"
              />
            )}
            <StatusMark
              status={done ? "pass" : "warn"}
              className={cn("size-7", current && "border-ink-100 dark:border-ink-100 border-2")}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <span className={cn("text-base", current ? "font-medium" : done ? "text-ink-400" : "text-ink-200")}>
                {title}
              </span>
              {current && <span className="text-ink-400 text-sm">{description}</span>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function WithWallet(progress: Progress) {
  const { primaryWallet } = useDynamicContext()

  return <Steps walletConnected={Boolean(primaryWallet)} {...progress} />
}

// The first steps of an account and the one to do next, until they are all done; the wallet's is ticked from what is
// connected. It says what to do, and the buttons for it are in the header, where they are only once.
export function GettingStarted(progress: Progress) {
  return useWalletEnabled() ? <WithWallet {...progress} /> : <Steps walletConnected={false} {...progress} />
}
