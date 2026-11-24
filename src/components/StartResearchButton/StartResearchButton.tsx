import { PiArrowRight } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

export function StartResearchButton({ portfolioId, className }: { portfolioId: string; className?: string }) {
  return (
    <AppLink
      route="research"
      slug={portfolioId}
      className={cn(buttonVariants({ intent: "dark", size: "compact" }), "rounded-xl", className)}
    >
      Start research
      <PiArrowRight size={16} aria-hidden="true" />
    </AppLink>
  )
}
