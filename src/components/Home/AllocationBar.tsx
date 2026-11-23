"use client"

import { useState } from "react"
import { PiArrowDownRight, PiArrowUpRight, PiMinus } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { Money } from "@/components/Money/Money"
import type { RouteId } from "@/config/routes"
import { ALLOCATION_FILLS, CASH_FILL, OTHER_FILL } from "@/constants/cards"
import { TONE_TEXT_CLASSNAME } from "@/constants/tone"
import { formatPercent } from "@/lib/format"
import { type AllocationSlice, OTHER_MODELS_ID } from "@/lib/home/allocation"
import { changeTone } from "@/lib/tone"
import { cn } from "@/lib/utils"

const CASH_ID = "cash"
const FLAT_BELOW = 0.0005

const fillOf = ({ id, index }: AllocationSlice) =>
  index === undefined
    ? id === OTHER_MODELS_ID
      ? OTHER_FILL
      : CASH_FILL
    : (ALLOCATION_FILLS[index % ALLOCATION_FILLS.length] ?? CASH_FILL)

// Where each one goes: a model to its page, the rest of them and the cash to the list of portfolios
const linkOf = ({ id }: AllocationSlice): { route: RouteId; slug?: string } =>
  id === OTHER_MODELS_ID || id === CASH_ID ? { route: "portfolios" } : { route: "portfolio", slug: id }

// Which way a model is going: up or down, and by how much, in green or red. Cash has no way to go, so it is left blank.
function Direction({ change }: { change?: number }) {
  if (change === undefined) return <span className="w-20" />
  // Too small to say which way it is going: it would be shown as 0%, so it is shown as flat
  const tone = Math.abs(change) < FLAT_BELOW ? "neutral" : changeTone(change)
  const Icon = tone === "positive" ? PiArrowUpRight : tone === "negative" ? PiArrowDownRight : PiMinus

  return (
    <span className={cn("flex w-20 items-center justify-end gap-1 tabular-nums", TONE_TEXT_CLASSNAME[tone])}>
      <Icon aria-hidden="true" size={14} />
      {formatPercent(change, { signed: true })}
      <span className="sr-only">{tone === "positive" ? "up" : tone === "negative" ? "down" : "flat"}</span>
    </span>
  )
}

// Where the money is, as a bar of what each model holds and the cash, with each one named and counted under it. Each
// is a link, and pointing at one in the bar or the list lights it and dims the rest.
export function AllocationBar({ slices }: { slices: AllocationSlice[] }) {
  const [active, setActive] = useState<string>()
  const total = slices.reduce((sum, { value }) => sum + value, 0)
  if (!total) return null

  const props = (id: string) => ({
    onMouseEnter: () => setActive(id),
    onMouseLeave: () => setActive(undefined),
    onFocus: () => setActive(id),
    onBlur: () => setActive(undefined),
  })
  const dimmed = (id: string) => active !== undefined && active !== id

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full gap-1">
        {slices.map((slice, i) => (
          <div key={slice.id} style={{ width: `${(slice.value / total) * 100}%` }} className="h-full min-w-1.5">
            <AppLink {...linkOf(slice)} className="block h-full outline-none">
              <span
                {...props(slice.id)}
                role="img"
                aria-label={`${slice.label} ${formatPercent(slice.value / total)}`}
                style={{ "--index": i } as React.CSSProperties}
                className={cn(
                  "animate-grow-x block h-full rounded-full transition-[opacity,transform] duration-200",
                  fillOf(slice),
                  dimmed(slice.id) && "opacity-30",
                  active === slice.id && "scale-y-150"
                )}
              />
            </AppLink>
          </div>
        ))}
      </div>
      <ul className="flex flex-col text-sm">
        {slices.map((slice, i) => (
          <li key={slice.id} style={{ "--index": i + 2 } as React.CSSProperties} className="animate-fade-up">
            <AppLink
              {...linkOf(slice)}
              className={cn(
                "hover:bg-hover-bg/70 -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-[background-color,opacity] duration-200",
                dimmed(slice.id) && "opacity-40"
              )}
            >
              <span {...props(slice.id)} className="flex flex-1 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 flex-none rounded-full transition-transform",
                    fillOf(slice),
                    active === slice.id && "scale-150"
                  )}
                />
                <span className="flex-1 truncate">{slice.label}</span>
                <Direction change={slice.change} />
                <span className="text-ink-400 w-12 text-right tabular-nums">{formatPercent(slice.value / total)}</span>
                <Money value={slice.value} className="w-40 justify-end" />
              </span>
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
