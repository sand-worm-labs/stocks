"use client"

import { PiCircleNotch, PiPencilSimple } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { useDraftFlow } from "@/components/Workspace/DraftFlow"
import type { AgentAction, AgentBlock } from "@/lib/agent/types"
import { cn } from "@/lib/utils"

const ICONS = { edit: PiPencilSimple } as const

// The main step forward reads as a violet word, with no box around it, so it doesn't compete with what is being read
const LINK_CLASSNAME = "text-primary inline-flex h-8 items-center gap-1.5 px-1 text-sm font-medium hover:underline"

function classNameOf({ intent }: AgentAction) {
  return intent === "link" ? LINK_CLASSNAME : cn(buttonVariants({ intent, size: "compact" }), "data-item gap-1.5")
}

export function ActionsBlock({ block: { actions } }: { block: Extract<AgentBlock, { type: "actions" }> }) {
  const draft = useDraftFlow()

  return (
    <div data-block className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon ? ICONS[action.icon] : undefined
        // Beside a draft, a step the page itself takes is a button that takes it; the page's own checks decide whether it goes through
        if (action.flow && draft) {
          return (
            <button
              key={action.label}
              type="button"
              disabled={draft.busy}
              aria-busy={draft.busy}
              onClick={draft[action.flow]}
              className={cn(classNameOf(action), "disabled:cursor-wait disabled:opacity-70")}
            >
              {draft.busy && <PiCircleNotch aria-hidden="true" size={14} className="animate-spin" />}
              <span data-item>{action.label}</span>
            </button>
          )
        }
        return (
          <AppLink key={action.label} route={action.route} slug={action.slug} className={classNameOf(action)}>
            {Icon && <Icon aria-hidden="true" size={14} />}
            <span data-item>{action.label}</span>
          </AppLink>
        )
      })}
    </div>
  )
}
