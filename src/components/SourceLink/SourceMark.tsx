import { NEUTRAL_SOURCE_MARK, SOURCE_MARKS } from "@/constants/sources"
import { cn } from "@/lib/utils"

type SourceMarkProps = { name: string; className?: string }

// The round logo of a source
export function SourceMark({ name, className }: SourceMarkProps) {
  const { letter, background } = SOURCE_MARKS[name] ?? { ...NEUTRAL_SOURCE_MARK, letter: name.charAt(0).toUpperCase() }

  return (
    <span
      aria-hidden="true"
      style={{ background }}
      className={cn(
        "flex size-4 flex-none items-center justify-center rounded-full text-[8px] leading-none font-medium tracking-tight text-white",
        className
      )}
    >
      {letter}
    </span>
  )
}
