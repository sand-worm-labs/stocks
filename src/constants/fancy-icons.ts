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

// The glyph inside each designed icon, as the same Phosphor icon twice: the filled one is the solid violet body, the duotone
// one is drawn over it for the white lines. To add one, put both here under a name, and use <FancyIcon name="..." />; the
// ring and the tile around it come with it.
export const FANCY_ICONS = {
  portfolio: { body: PiFolderFill, lines: PiFolderDuotone },
  funds: { body: PiWalletFill, lines: PiWalletDuotone },
  holdings: { body: PiStackFill, lines: PiStackDuotone },
  activity: { body: PiLightningFill, lines: PiLightningDuotone },
}

export type FancyIconName = keyof typeof FANCY_ICONS
