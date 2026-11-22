import { SourceMark } from "@/components/SourceLink/SourceMark"
import type { Source } from "@/lib/markets/types"

const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, "")

// A source as a small pill: its logo and the site it lives on
export function SourcePill({ name, url, title }: Source) {
  return (
    <a
      href={url}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-hover-bg border-hover-border text-ink-200 hover:text-ink-100 inline-flex items-center gap-1.5 rounded-full border py-px pr-2 pl-[3px] align-middle text-xs font-medium whitespace-nowrap transition-colors dark:bg-white/5"
    >
      <SourceMark name={name} className="size-3.5 text-[7px]" />
      {hostname(url)}
    </a>
  )
}
