"use client"

import { PiCaretLeft, PiCaretRight } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}

function pagesToShow(page: number, count: number): (number | "gap")[] {
  const wanted = new Set([0, count - 1, page - 1, page, page + 1])
  const sorted = [...wanted].filter((n) => n >= 0 && n < count).sort((a, b) => a - b)

  return sorted.flatMap((n, i) => (i > 0 && n - (sorted[i - 1] ?? 0) > 1 ? ["gap" as const, n] : [n]))
}

export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const count = Math.ceil(total / pageSize)
  if (count <= 1) return null

  const first = page * pageSize + 1
  const last = Math.min((page + 1) * pageSize, total)
  const button = buttonVariants({ intent: "outline", size: "sm", className: "min-w-0 px-3 disabled:opacity-40" })

  return (
    <nav aria-label="Pages" className="text-ink-400 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="tabular-nums">
        {first}–{last} of {total}
      </span>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className={button}
        >
          <PiCaretLeft size={14} />
        </button>
        {pagesToShow(page, count).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-label={`Page ${n + 1}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPage(n)}
              className={cn(
                "size-8 rounded-lg text-sm tabular-nums transition-colors",
                n === page ? "bg-ink-100 text-block-surface" : "hover:bg-hover-bg hover:text-ink-100"
              )}
            >
              {n + 1}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page === count - 1}
          onClick={() => onPage(page + 1)}
          className={button}
        >
          <PiCaretRight size={14} />
        </button>
      </span>
    </nav>
  )
}
