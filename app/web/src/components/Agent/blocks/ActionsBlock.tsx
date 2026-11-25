"use client"

import { PiCircleNotch } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { useDraftFlow } from "@/components/Workspace/DraftFlow"
import { ICONS, LINK_CLASSNAME } from "@/constants/components/agent/blocks/actions-block"
import { cn } from "@/lib/utils"
import type { AgentAction, AgentBlock } from "@/types/agent"

function classNameOf({ intent }: AgentAction) {
  return intent === "link" ? LINK_CLASSNAME : cn(buttonVariants({ intent, size: "compact" }), "data-item gap-1.5")
}

export function ActionsBlock({ block: { actions } }: { block: Extract<AgentBlock, { type: "actions" }> }) {
  const draft = useDraftFlow()

  return (
    <div data-block className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon ? ICONS[action.icon] : undefined
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
