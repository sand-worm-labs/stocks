import { Badge } from "@/components/ui/badge"
import { TONE_DOT_CLASSNAME, TONE_TEXT_CLASSNAME } from "@/constants/tone"
import type { Report } from "@/lib/report/types"

type VerdictPillProps = {
  verdict: Report["verdict"]
  prefix?: string
  // Only the dot and the words, with no pill around them
  plain?: boolean
}

// The verdict on a report: whether it is edge or gambling
export function VerdictPill({ verdict: { tone, label }, prefix, plain }: VerdictPillProps) {
  const content = (
    <>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${TONE_DOT_CLASSNAME[tone]}`} />
      {prefix}
      {prefix ? label.toLowerCase() : label}
    </>
  )

  if (plain) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TONE_TEXT_CLASSNAME[tone]}`}>
        {content}
      </span>
    )
  }

  return <Badge tone={tone}>{content}</Badge>
}
