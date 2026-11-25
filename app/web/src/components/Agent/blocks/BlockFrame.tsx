import type { ReactNode } from "react"

type BlockFrameProps = { title: ReactNode; aside?: string; children: ReactNode }

export function BlockFrame({ title, aside, children }: BlockFrameProps) {
  return (
    <div
      data-block
      className="border-border-secondary dark:border-border-tertiary overflow-hidden rounded-[10px] border"
    >
      <div className="bg-hover-bg border-border-secondary dark:border-border-tertiary flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b px-3 py-2 dark:bg-white/5">
        <span className="flex items-center gap-2 text-[13px] font-medium">{title}</span>
        {aside && <span className="text-ink-400 text-xs">{aside}</span>}
      </div>
      {children}
    </div>
  )
}
