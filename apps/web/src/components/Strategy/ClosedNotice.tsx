import Link from "next/link"
import { PiLockSimple } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { Card } from "@/components/ui/card"
import { routeHref } from "@/config/routes"
import { formatDay } from "@/lib/dates"

// What the overview of a closed strategy says: it ended, nothing is held, and what is kept to read
export function ClosedNotice({ id, closedAt }: { id: string; closedAt?: string }) {
  return (
    <Card role="note" className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <PiLockSimple aria-hidden="true" size={22} className="text-ink-400 mt-0.5 flex-none" />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Closed{closedAt ? ` on ${formatDay(closedAt)}` : ""}</h2>
          <p className="text-ink-400 max-w-xl text-sm leading-6">
            Everything was sold and the cash taken out, so it holds nothing now. Its results and everything it did are kept here to read. When you
            no longer need it, move it to the trash from Manage.
          </p>
        </div>
      </div>
      <Link href={routeHref("report", undefined, id) ?? `/strategies/${id}/report`} className={buttonVariants({ intent: "outline", size: "compact" })}>
        Read the results
      </Link>
    </Card>
  )
}
