import { PiCaretDownFill, PiCaretUpDownFill, PiCaretUpFill } from "react-icons/pi"

export const DEFAULT_PAGE_SIZES = [25, 50, 100]

export const SORT_ICON = { asc: PiCaretUpFill, desc: PiCaretDownFill, none: PiCaretUpDownFill } as const

export const ARIA_SORT = { asc: "ascending", desc: "descending", none: "none" } as const
