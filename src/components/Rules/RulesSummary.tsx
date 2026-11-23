import { PiLockKey } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { TONE_TILE_CLASSNAME } from "@/constants/tone"
import { formatDay, formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"

type RulesSummaryProps = { passing: number; total: number; lockedAt?: string; checkedAt?: string; portfolioId: string }

// How the rules stand: how many hold, when they were locked and last checked, and the way to change them
export function RulesSummary({ passing, total, lockedAt, checkedAt, portfolioId }: RulesSummaryProps) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn("flex size-10 flex-none items-center justify-center rounded-lg", TONE_TILE_CLASSNAME.neutral)}
        >
          <PiLockKey size={20} />
        </span>
        <div className="flex flex-col">
          <span className="font-medium">{total ? `${passing} of ${total} rules hold` : "No rules"}</span>
          <span className="text-ink-400 text-sm">
            Locked {lockedAt && formatDay(lockedAt)} · last checked {checkedAt && `today ${formatTime(checkedAt)}`}.
            Every trade is checked against them first.
          </span>
        </div>
      </div>
      <AppLink route="adapt" slug={portfolioId} className={buttonVariants({ intent: "outline", size: "compact" })}>
        Change rules
      </AppLink>
    </Card>
  )
}
