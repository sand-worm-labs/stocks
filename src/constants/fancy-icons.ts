import {
  PiFolderDuotone,
  PiFolderFill,
  PiLightningDuotone,
  PiLightningFill,
  PiStackDuotone,
  PiStackFill,
  PiWalletDuotone,
  PiWalletFill,
} from "react-icons/pi"

export const FANCY_ICONS = {
  portfolio: { body: PiFolderFill, lines: PiFolderDuotone },
  funds: { body: PiWalletFill, lines: PiWalletDuotone },
  holdings: { body: PiStackFill, lines: PiStackDuotone },
  activity: { body: PiLightningFill, lines: PiLightningDuotone },
}

export type FancyIconName = keyof typeof FANCY_ICONS
