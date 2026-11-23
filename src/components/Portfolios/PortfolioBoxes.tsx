"use client"

import { useState } from "react"

import { PortfolioPreviewCard } from "@/components/Home/PortfolioPreviewCard"
import type { Portfolio } from "@/lib/portfolios/types"
import type { Session } from "@/lib/session/types"

// Boxes are tall, so this many are shown and the rest come on request
const PAGE = 12

// The portfolios as boxes, the way the home shows them: each its own colour, line and icon
export function PortfolioBoxes({ portfolios, mode }: { portfolios: Portfolio[]; mode: Session["network"]["mode"] }) {
  const [shown, setShown] = useState(PAGE)
  if (!portfolios.length) return <p className="text-ink-400 py-20 text-center text-sm">No portfolios match.</p>

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
        {portfolios.slice(0, shown).map((portfolio, index) => (
          <PortfolioPreviewCard key={portfolio.id} portfolio={portfolio} index={index} mode={mode} />
        ))}
      </div>
      {shown < portfolios.length && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE)}
          className="border-border-secondary text-ink-200 hover:text-ink-100 hover:bg-hover-bg dark:border-border-tertiary rounded-full border px-5 py-2 text-sm transition-colors"
        >
          Show {Math.min(PAGE, portfolios.length - shown)} more
          <span className="text-ink-400"> · {portfolios.length - shown} left</span>
        </button>
      )}
    </div>
  )
}
