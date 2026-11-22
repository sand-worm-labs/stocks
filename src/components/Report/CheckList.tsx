import { PiCheck, PiExclamationMark, PiX } from "react-icons/pi"

import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { Check } from "@/lib/report/types"
import { cn } from "@/lib/utils"

const ICON = { positive: PiCheck, negative: PiX } as const

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="flex flex-col">
      {checks.map(({ id, tone, text }, i) => {
        const Icon = ICON[tone as keyof typeof ICON] ?? PiExclamationMark
        return (
          <li
            key={id}
            style={{ "--index": i } as React.CSSProperties}
            className="animate-fade-up flex items-start gap-2.5 py-2 text-sm leading-[21px]"
          >
            <Icon aria-hidden="true" size={14} className={cn("mt-[3px] flex-none", TONE_TEXT_CLASSNAME[tone])} />
            <span>{text}</span>
          </li>
        )
      })}
    </ul>
  )
}
