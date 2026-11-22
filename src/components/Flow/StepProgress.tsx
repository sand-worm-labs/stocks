import { Fragment } from "react"
import { PiCheckBold } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { FLOW_STEPS, type FlowStepId } from "@/constants/flow"
import { cn } from "@/lib/utils"

type StepProgressProps = {
  current: FlowStepId
  // The portfolio the steps belong to. Without one (the brief step), done steps have nothing to link back to.
  portfolioId?: string
}

// Where the person is in the flow: a numbered circle for each step, joined by a line. A step done is a tick, the one
// they are on is filled, and the ones to come are outlined. Labels are medium weight throughout, centred on the page.
export function StepProgress({ current, portfolioId }: StepProgressProps) {
  const index = FLOW_STEPS.findIndex(({ id }) => id === current)

  return (
    <nav aria-label="Progress" className="flex flex-wrap items-center justify-center gap-2.5">
      {FLOW_STEPS.map(({ id, label, route }, i) => {
        const isDone = i < index
        const isCurrent = i === index
        const body = (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 flex-none items-center justify-center rounded-full border text-sm font-medium",
                isDone || isCurrent
                  ? "bg-base-400 border-base-400 text-primary-foreground dark:border-white dark:bg-white dark:text-black"
                  : "border-border-secondary bg-block-surface text-ink-300 dark:border-border-tertiary"
              )}
            >
              {isDone ? <PiCheckBold size={14} /> : i + 1}
            </span>
            {label}
          </>
        )
        const className = cn(
          "inline-flex items-center gap-2 text-sm font-medium whitespace-nowrap",
          isCurrent || isDone ? "text-ink-100" : "text-ink-300"
        )

        return (
          <Fragment key={id}>
            {i > 0 && (
              <span
                aria-hidden="true"
                className="bg-border-secondary dark:bg-border-tertiary h-px max-w-12 min-w-3 flex-1"
              />
            )}
            {isDone && portfolioId ? (
              <AppLink
                route={route}
                slug={portfolioId}
                className={cn(className, "transition-opacity hover:opacity-70")}
              >
                {body}
              </AppLink>
            ) : (
              <span aria-current={isCurrent ? "step" : undefined} className={className}>
                {body}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
