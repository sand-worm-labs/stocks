import { PiList, PiSquaresFour } from "react-icons/pi"

export const LAYOUT_KEY = "sw.portfolios.layout"

export const LAYOUTS = [
  { id: "boxes", label: "Boxes", icon: PiSquaresFour },
  { id: "list", label: "List", icon: PiList },
] as const

export const SORTING = {
  profit: [{ id: "return", desc: true }],
  value: [{ id: "value", desc: true }],
  newest: [{ id: "created", desc: true }],
} as const
