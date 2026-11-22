import { PiCheck } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { FLOW_STEPS, type FlowStepId } from "@/constants/flow"
import { cn } from "@/lib/utils"

type StepProgressProps = {
  current: FlowStepId
  // The portfolio the steps belong to. Without one (the brief step), done steps have nothing to link back to.
  portfolioId?: string
}

export function StepProgress({ current, portfolioId }: StepProgressProps) {
  const index = FLOW_STEPS.findIndex(({ id }) => id === current)
  const next = FLOW_STEPS[index + 1]

  return (
    <nav aria-label="Progress" className="flex flex-col gap-3">
      <ol className="grid grid-cols-5 gap-2 md:gap-4">
        {FLOW_STEPS.map(({ id, label, hint, route }, i) => {
          const isDone = i < index
          const isCurrent = i === index
          const body = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "h-[2.5px] w-full rounded-full",
                  isCurrent
                    ? "bg-rainbow-gradient"
                    : isDone
                      ? "bg-primary"
                      : "bg-border-secondary dark:bg-border-tertiary"
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1.5 px-0.5 text-xs md:text-sm",
                  isCurrent ? "text-ink-100 font-medium" : isDone ? "text-ink-200" : "text-ink-300"
                )}
              >
                {isDone ? <PiCheck aria-hidden="true" className="text-primary flex-none" /> : <span>{i + 1}.</span>}
                <span className="truncate">{label}</span>
              </span>
              <span className="text-ink-400 hidden truncate px-0.5 text-xs md:block">{isDone ? "Done" : hint}</span>
            </>
          )

          return (
            <li key={id} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
              {isDone && portfolioId ? (
                <AppLink
                  route={route}
                  slug={portfolioId}
                  className="group flex flex-col gap-2 transition-opacity hover:opacity-80"
                >
                  {body}
                </AppLink>
              ) : (
                <div className="flex flex-col gap-2">{body}</div>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-ink-400 text-xs">
        Step {index + 1} of {FLOW_STEPS.length} · {FLOW_STEPS[index]?.label}
        {next ? ` · Next: ${next.label}` : " · Last step"}
      </p>
    </nav>
  )
}
