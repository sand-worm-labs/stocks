import { PiPlus } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { IconTile } from "@/components/ui/icon-tile"

// A box in the grid of portfolios for making another: the same size as the rest, drawn as an empty place
export function NewPortfolioCard() {
  return (
    <AppLink
      route="newPortfolio"
      className="border-border dark:border-border-tertiary hover:border-primary hover:bg-hover-bg/40 flex h-72 flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed p-4 text-center transition-colors"
    >
      <IconTile icon={PiPlus} />
      <span className="font-medium">New strategy</span>
      <span className="text-ink-400 text-sm">Start from an idea or a stock</span>
    </AppLink>
  )
}
