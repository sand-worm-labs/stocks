import { Badge } from "@/components/ui/badge"
import { TONE_DOT_CLASSNAME } from "@/constants/tone"
import type { AgentStatus } from "@/lib/agent/types"
import { cn } from "@/lib/utils"

type FlowHeaderProps = { title: string; subtitle: string; status: AgentStatus }

// What this portfolio is, and what it is waiting for
export function FlowHeader({ title, subtitle, status }: FlowHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{title}</h1>
        <p className="text-ink-400 text-sm">{subtitle}</p>
      </div>
      <Badge className="gap-2 px-3 py-1">
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", TONE_DOT_CLASSNAME[status.tone])} />
        {status.label}
      </Badge>
    </div>
  )
}
