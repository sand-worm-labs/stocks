import { PiPlus } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

export function NewPortfolioButton({ className }: { className?: string }) {
  return (
    <AppLink
      route="newPortfolio"
      className={cn(buttonVariants({ intent: "dark", size: "compact" }), "rounded-xl", className)}
    >
      <PiPlus size={16} aria-hidden="true" />
      New strategy
    </AppLink>
  )
}
