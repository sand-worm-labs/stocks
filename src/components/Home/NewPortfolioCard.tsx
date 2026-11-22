import { PiPlus } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { IconTile } from "@/components/ui/icon-tile"

export function NewPortfolioCard() {
  return (
    <AppLink
      route="newPortfolio"
      className="border-border dark:border-border-tertiary hover:border-primary flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-center transition-colors"
    >
      <IconTile icon={PiPlus} />
      <span className="font-medium">New portfolio</span>
      <span className="text-ink-400 text-sm">Start from a brief or a stock</span>
    </AppLink>
  )
}
