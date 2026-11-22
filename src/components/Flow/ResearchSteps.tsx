import { PiCheckCircle, PiCircle, PiSpinnerGap } from "react-icons/pi"

import { RESEARCH_STEPS, SANDWORM_APP_URL } from "@/constants/flow"
import { cn } from "@/lib/utils"

type ResearchStepsProps = {
  // How many steps are finished. The next one is running.
  done: number
  // Steps listed as reused, not re-run (a changed version only reruns some)
  reused?: readonly string[]
}

export function ResearchSteps({ done, reused = [] }: ResearchStepsProps) {
  return (
    <ol className="flex flex-col gap-2 text-sm">
      {RESEARCH_STEPS.map((step, i) => {
        const Icon = i < done ? PiCheckCircle : i === done ? PiSpinnerGap : PiCircle
        return (
          <li key={step} className={cn("flex items-center gap-2", i > done && "text-ink-400")}>
            <Icon aria-hidden="true" className={cn(i < done && "text-emerald-600", i === done && "animate-spin")} />
            <span className="flex-1">
              {step}
              {reused.includes(step) && " (reused)"}
            </span>
            {i < done && (
              <a
                href={SANDWORM_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-400 hover:text-ink-100 text-xs underline"
              >
                Sandworm ↗
              </a>
            )}
          </li>
        )
      })}
    </ol>
  )
}
