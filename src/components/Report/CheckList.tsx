import { PiCheckCircle, PiWarningCircle, PiXCircle } from "react-icons/pi"

import { Badge } from "@/components/ui/badge"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { Check } from "@/lib/report/types"

const ICON = { positive: PiCheckCircle, warning: PiWarningCircle, negative: PiXCircle } as const

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {checks.map(({ id, tone, text, term }) => {
        const Icon = ICON[tone as keyof typeof ICON] ?? PiCheckCircle
        return (
          <li key={id} className="flex items-start gap-2 text-sm">
            <Icon aria-hidden="true" size={18} className={`${TONE_TEXT_CLASSNAME[tone]} mt-0.5 flex-none`} />
            <span>
              {text} {term && <Badge className="ml-1">{term}</Badge>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
