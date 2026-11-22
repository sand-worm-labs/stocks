import { PiLightbulb } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { SectionHeader } from "@/components/SectionHeader/SectionHeader"
import { Card, CardRow } from "@/components/ui/card"
import { IconTile } from "@/components/ui/icon-tile"
import type { Idea } from "@/lib/home/types"

export function IdeasToTry({ ideas }: { ideas: Idea[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Ideas to try" />
      <Card>
        {ideas.map(({ id, title, hint }) => (
          <CardRow key={id}>
            <AppLink
              route="newPortfolio"
              className="hover:bg-inputBg flex items-center gap-3 p-4 transition-colors dark:hover:bg-white/5"
            >
              <IconTile icon={PiLightbulb} />
              <span className="flex flex-col">
                <span className="font-medium">{title}</span>
                <span className="text-ink-400 text-sm">{hint}</span>
              </span>
            </AppLink>
          </CardRow>
        ))}
      </Card>
    </section>
  )
}
