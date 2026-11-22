import localFont from "next/font/local"

// Azeret Mono (OFL), latin, weights 300 to 500 in one variable file. Same files as sandworm-web.
export const baseFont = localFont({
  src: "../../public/fonts/azeret-mono/AzeretMono-Latin-Variable.woff2",
  weight: "300 500",
  display: "swap",
  adjustFontFallback: false,
})

// Preloaded so Moderat arrives with the HTML instead of after the CSS is parsed.
export const preloadedFontPaths = [
  "/fonts/moderat/Moderat-Regular.woff2",
  "/fonts/moderat/Moderat-Medium.woff2",
] as const
