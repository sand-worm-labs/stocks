import type { IconType } from "react-icons"
import { PiArrowsLeftRight, PiHourglass, PiShieldWarning } from "react-icons/pi"

import type { AttentionItem } from "@/lib/home/types"

export const ATTENTION_ICON: Record<AttentionItem["tone"], IconType> = {
  warning: PiHourglass,
  negative: PiShieldWarning,
  info: PiArrowsLeftRight,
}
