import { Badge } from "@/components/ui/badge"
import { PORTFOLIO_STATUS, type PortfolioStatus } from "@/constants/portfolio"
import { TONE_DOT_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"

export function PortfolioStatusBadge({ status }: { status: PortfolioStatus }) {
  const { label, tone } = PORTFOLIO_STATUS[status]

  return (
    <Badge tone={tone}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASSNAME[tone])} />
      {label}
    </Badge>
  )
}
