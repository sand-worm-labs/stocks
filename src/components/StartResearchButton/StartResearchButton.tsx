import { PiArrowRight } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

// The one thing to do on a token's page, so it moves: a ring that pings out of it, a shake now and then, and an arrow
// leaning towards where it goes
export function StartResearchButton({ portfolioId, className }: { portfolioId: string; className?: string }) {
  return (
    <span className={cn("animate-wiggle relative inline-flex", className)}>
      <span aria-hidden="true" className="bg-base-400 animate-ring absolute inset-0 rounded-xl dark:bg-white" />
      <AppLink
        route="research"
        slug={portfolioId}
        className={cn(
          buttonVariants({ intent: "dark", size: "lg" }),
          "relative min-w-0 gap-2.5 rounded-xl px-7 font-medium"
        )}
      >
        Start research
        <PiArrowRight size={18} aria-hidden="true" className="animate-nudge" />
      </AppLink>
    </span>
  )
}
