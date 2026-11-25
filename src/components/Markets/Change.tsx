import { PiCaretDownFill, PiCaretUpFill } from "react-icons/pi"

import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

export function Change({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-ink-400">—</span>

  const tone = changeTone(value)

  return (
    <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", TONE_TEXT_CLASSNAME[tone])}>
      {tone === "positive" && <PiCaretUpFill size={9} aria-hidden="true" />}
      {tone === "negative" && <PiCaretDownFill size={9} aria-hidden="true" />}
      {formatPercent(Math.abs(value))}
    </span>
  )
}
