import { BLOCKS, INDICATORS, WEIGHTINGS } from "@/lib/strategy/catalog"
import { cn } from "@/lib/utils"

import { MENU_STYLE } from "./blocks"

// Everything a strategy can be built from: the blocks, the ways to divide a group, and the indicators a decision can read
export function BlockPalette() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-medium">Everything a strategy is built from</h3>
        <span className="text-ink-400 text-xs">Blocks go inside blocks, as deep as you like.</span>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {BLOCKS.map(({ id, label, description }) => {
          const { icon: Icon, tile } = MENU_STYLE[id]

          return (
            <li
              key={id}
              className="border-border-secondary dark:border-border-tertiary flex flex-col gap-2 rounded-xl border p-3"
            >
              <span
                aria-hidden="true"
                className={cn("flex size-8 items-center justify-center rounded-lg border", tile)}
              >
                <Icon size={16} />
              </span>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-ink-400 text-xs leading-snug">{description}</span>
            </li>
          )
        })}
      </ul>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-2">
          <h4 className="text-ink-400 text-xs font-medium">Indicators a decision can read</h4>
          <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {INDICATORS.map(({ label, description }) => (
              <li key={label} className="flex flex-col text-[13px]">
                <span className="font-medium">{label}</span>
                <span className="text-ink-400 text-xs">{description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="text-ink-400 text-xs font-medium">Ways a group divides itself</h4>
          <ul className="flex flex-col gap-1.5">
            {WEIGHTINGS.map(({ id, label, description }) => (
              <li key={id} className="flex flex-col text-[13px]">
                <span className="font-medium">{label}</span>
                <span className="text-ink-400 text-xs">{description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
