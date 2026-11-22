import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { Kpi } from "@/lib/home/types"
import { cn } from "@/lib/utils"

export function KpiFigure({ kpi: { label, value, caption, tone = "neutral" } }: { kpi: Kpi }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-4 md:px-6 md:py-5">
      <span className="text-ink-400 text-sm">{label}</span>
      <span
        className={cn(
          "text-2xl font-medium tabular-nums md:text-[28px] md:leading-9",
          tone !== "neutral" && TONE_TEXT_CLASSNAME[tone]
        )}
      >
        {value}
      </span>
      <span className="text-ink-400 text-xs">{caption}</span>
    </div>
  )
}
