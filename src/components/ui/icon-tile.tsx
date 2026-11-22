import type { IconType } from "react-icons"

import { type Tone, TONE_TILE_CLASSNAME } from "@/constants/tone"
import { cn } from "@/lib/utils"

type IconTileProps = { icon: IconType; tone?: Tone; className?: string }

function IconTile({ icon: Icon, tone = "neutral", className }: IconTileProps) {
  return (
    <span
      data-slot="icon-tile"
      aria-hidden="true"
      className={cn(
        "flex size-10 flex-none items-center justify-center rounded-lg",
        TONE_TILE_CLASSNAME[tone],
        className
      )}
    >
      <Icon size={20} />
    </span>
  )
}

export { IconTile }
