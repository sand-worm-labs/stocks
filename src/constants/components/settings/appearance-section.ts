import type { ThemeId } from "@/types/ui"

export const PREVIEW = {
  light: { page: "bg-swatch-light-page", block: "bg-swatch-light-block" },
  dark: { page: "bg-swatch-dark-page", block: "bg-swatch-dark-block" },
} satisfies Record<ThemeId, { page: string; block: string }>
