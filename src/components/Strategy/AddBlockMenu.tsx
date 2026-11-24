"use client"

import { type ReactNode, useState } from "react"
import { PiCaretLeft, PiCaretRight, PiPlus } from "react-icons/pi"

import { StockAvatar } from "@/components/StockAvatar/StockAvatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SearchField } from "@/components/ui/search-field"
import { BLOCKS, WEIGHTINGS } from "@/lib/strategy/catalog"
import { NEEDS_STOCK, type NewBlock, newBlock } from "@/lib/strategy/edit"
import type { Node } from "@/lib/strategy/types"
import { cn } from "@/lib/utils"

import { MENU_STYLE } from "./blocks"

type AddBlockMenuProps = {
  // What it adds to, for the label of the button
  to: string
  // Stocks to start a decision from: the ones the strategy already uses first
  seed: string[]
  // Every stock that can be held
  symbols: string[]
  onAdd: (node: Node) => void
}

type Step = "kinds" | "stock" | "weight" | "any-all"

const ROW =
  "hover:bg-hover-bg focus-visible:bg-hover-bg flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-none disabled:opacity-40 disabled:hover:bg-transparent"
const MATCHES = [
  { match: "all" as const, label: "All must hold", description: "Every condition has to be true." },
  { match: "any" as const, label: "Any one will do", description: "One true condition is enough." },
]

// The add menu, after Composer's: a list of what can go in, each with its tile. Stock, Weight and Any / all ask one thing more
// before they add.
export function AddBlockMenu({ to, seed, symbols, onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("kinds")
  const [query, setQuery] = useState("")

  const close = () => {
    setOpen(false)
    setStep("kinds")
    setQuery("")
  }
  const add = (block: NewBlock) => {
    const node = newBlock(block, seed)
    if (!node) return
    onAdd(node)
    close()
  }
  const found = symbols.filter((symbol) => symbol.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 60)

  let body: ReactNode
  if (step === "kinds") {
    body = (
      <>
        <p className="text-ink-100 px-4 pt-3.5 pb-2 text-xs font-semibold tracking-wider uppercase">Add block</p>
        <ul className="pb-1.5">
          {BLOCKS.map(({ id, label }) => {
            const { icon: Icon, tile } = MENU_STYLE[id]
            const asks = id === "asset" || id === "weight" || id === "any-all"
            const missing = !seed.length && NEEDS_STOCK.includes(id as NewBlock["kind"])

            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={missing}
                  onClick={() => {
                    if (id === "asset" || id === "weight" || id === "any-all") setStep(id === "asset" ? "stock" : id)
                    else add({ kind: id })
                  }}
                  className={ROW}
                >
                  <span
                    aria-hidden="true"
                    className={cn("flex size-7 flex-none items-center justify-center rounded-md border", tile)}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="flex-1">{label}</span>
                  {asks && <PiCaretRight aria-hidden="true" size={14} className="text-ink-400" />}
                </button>
              </li>
            )
          })}
        </ul>
      </>
    )
  } else {
    const title = step === "stock" ? "Pick a stock" : step === "weight" ? "Split by" : "Conditions"
    body = (
      <>
        <button
          type="button"
          onClick={() => {
            setStep("kinds")
            setQuery("")
          }}
          className="text-ink-200 hover:text-ink-100 flex items-center gap-1.5 px-4 pt-3.5 pb-2 text-xs font-semibold tracking-wider uppercase transition-colors outline-none"
        >
          <PiCaretLeft aria-hidden="true" size={12} />
          {title}
        </button>
        {step === "stock" && (
          <>
            <div className="px-3 pb-2">
              <SearchField
                value={query}
                onChange={setQuery}
                label="Search stocks"
                placeholder="Search stocks..."
                appearance="card"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto pb-1.5">
              {found.map((symbol) => (
                <li key={symbol}>
                  <button type="button" onClick={() => add({ kind: "asset", symbol })} className={ROW}>
                    <StockAvatar symbol={symbol} className="size-7" />
                    {symbol}
                  </button>
                </li>
              ))}
              {!found.length && <li className="text-ink-400 px-4 py-3 text-sm">No stock matches that.</li>}
            </ul>
          </>
        )}
        {step === "weight" && (
          <ul className="pb-1.5">
            {WEIGHTINGS.map(({ id, label, description }) => (
              <li key={id}>
                <button type="button" onClick={() => add({ kind: "weight", weighting: id })} className={ROW}>
                  <span className="flex flex-col">
                    <span>{label}</span>
                    <span className="text-ink-400 text-xs">{description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {step === "any-all" && (
          <ul className="pb-1.5">
            {MATCHES.map(({ match, label, description }) => (
              <li key={match}>
                <button type="button" onClick={() => add({ kind: "any-all", match })} className={ROW}>
                  <span className="flex flex-col">
                    <span>{label}</span>
                    <span className="text-ink-400 text-xs">{description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setOpen(true)
        else close()
      }}
    >
      <PopoverTrigger
        aria-label={`Add a block to ${to}`}
        className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg nodrag nopan flex size-6 flex-none items-center justify-center rounded-md transition-colors"
      >
        <PiPlus aria-hidden="true" size={14} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(300px,calc(100vw-2rem))] p-0">
        {body}
      </PopoverContent>
    </Popover>
  )
}
