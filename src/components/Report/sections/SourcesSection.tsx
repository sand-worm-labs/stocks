import { PiArrowUpRight } from "react-icons/pi"

import { SourceMark } from "@/components/SourceLink/SourceMark"
import { Card } from "@/components/ui/card"
import { SANDWORM_APP_URL } from "@/constants/flow"
import type { Report } from "@/lib/report/types"
import { cn } from "@/lib/utils"
import { listItemHoverClassName } from "@/styles/interactive"

// How many logos sit in the stack by the title
const STACK = 5

export function SourcesSection({ sources }: { sources: Report["sources"] }) {
  return (
    <Card className="rounded-[14px] px-4 py-[18px] md:px-6">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden="true" className="flex">
            {sources.slice(0, STACK).map(({ name }, i) => (
              <SourceMark
                key={name}
                name={name}
                className={cn("ring-block-surface size-[18px] ring-2", i > 0 && "-ml-[5px]")}
              />
            ))}
          </span>
          Sources
        </h3>
        <a
          href={SANDWORM_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent dark:text-primary text-[13px] font-normal hover:underline"
        >
          Open the full research ↗
        </a>
      </div>
      <ol className="-mx-2 flex flex-col">
        {sources.map(({ name, url, title, note }, i) => (
          <li key={url} style={{ "--index": i } as React.CSSProperties} className="animate-fade-up">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("group flex items-center gap-2.5 px-2 py-[9px]", listItemHoverClassName)}
            >
              <span className="text-ink-400 w-4 text-[11px] tabular-nums">{i + 1}</span>
              <SourceMark name={name} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{title}</span>
              <span className="text-ink-400 hidden text-xs sm:block">{note}</span>
              <PiArrowUpRight
                aria-hidden="true"
                size={14}
                className="text-ink-400 flex-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </a>
          </li>
        ))}
      </ol>
    </Card>
  )
}
