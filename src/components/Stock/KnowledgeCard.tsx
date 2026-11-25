import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { SourceLink } from "@/components/SourceLink/SourceLink"
import { Badge } from "@/components/ui/badge"
import { Card, CardRow } from "@/components/ui/card"
import type { Knowledge } from "@/types/markets"

export function KnowledgeCard({ knowledge }: { knowledge: Knowledge[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="What the agent knows" />
      <Card>
        {knowledge.map(({ id, kind, text, source }) => (
          <CardRow key={id} className="flex flex-col items-start gap-2 p-4 text-sm">
            <Badge tone={kind === "fact" ? "info" : "neutral"}>{kind === "fact" ? "Fact" : "Opinion"}</Badge>
            <span>
              {text} {source && <SourceLink {...source} />}
            </span>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
