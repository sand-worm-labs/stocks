import type { ReactNode } from "react"

import type { PortfolioStatus } from "@/constants/portfolio"
import { cn } from "@/lib/utils"

const LiveArt = (
  <>
    <rect x="22" y="74" width="44" height="8" rx="3" className="fill-ink-100" opacity=".18" />
    <rect x="34" y="62" width="20" height="14" rx="3" className="fill-ink-100" />
    <path
      d="M44 62 L60 34 L88 24"
      fill="none"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-ink-100"
    />
    <circle cx="60" cy="34" r="6" strokeWidth="3" className="fill-block-surface stroke-ink-100" />
    <circle cx="44" cy="62" r="5" strokeWidth="3" className="fill-block-surface stroke-ink-100" />
    <path d="M88 24 l10 -6 M88 24 l12 4" strokeWidth="4" strokeLinecap="round" className="stroke-ink-100" />
    <rect x="92" y="40" width="16" height="16" rx="3" strokeWidth="2" className="fill-primary/15 stroke-primary" />
  </>
)

const CHIP_PINS = [38, 50, 62, 74]

const DraftArt = (
  <>
    {CHIP_PINS.flatMap((x) =>
      [12, 66].map((y) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="10" rx="2" className="fill-primary" opacity=".5" />
      ))
    )}
    <rect x="30" y="20" width="56" height="48" rx="8" className="fill-primary" />
    <rect x="44" y="32" width="28" height="24" rx="4" fill="none" strokeWidth="2.5" className="stroke-white" />
    <path
      d="M50 50 l6 -8 6 4 6 -10"
      fill="none"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-white"
    />
  </>
)

const UnbuildableArt = (
  <>
    <path
      d="M60 10 L88 20 V42 C88 60 76 72 60 78 C44 72 32 60 32 42 V20 Z"
      strokeWidth="3"
      strokeLinejoin="round"
      className="fill-red-600/15 stroke-red-600"
    />
    <text x="60" y="52" textAnchor="middle" fontSize="18" fontWeight="700" className="fill-red-700 dark:fill-red-400">
      20%
    </text>
  </>
)

const ART: Record<PortfolioStatus, { art: ReactNode; tileClassName: string }> = {
  live: { art: LiveArt, tileClassName: "bg-inputBg dark:bg-white/5" },
  draft: { art: DraftArt, tileClassName: "bg-primary/10" },
  unbuildable: { art: UnbuildableArt, tileClassName: "bg-red-50 dark:bg-red-950" },
}

export function PortfolioArt({ status }: { status: PortfolioStatus }) {
  const { art, tileClassName } = ART[status]

  return (
    <span
      aria-hidden="true"
      className={cn("flex h-[42px] w-[52px] flex-none items-center justify-center rounded-lg", tileClassName)}
    >
      <svg width="44" height="34" viewBox="0 0 120 88">
        {art}
      </svg>
    </span>
  )
}
