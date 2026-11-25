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

// Instrument Serif (OFL), latin, regular and italic: for the few big headings that should feel set, not typed.
export const displayFont = localFont({
  src: [
    { path: "../../public/fonts/instrument-serif/InstrumentSerif-Latin-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/instrument-serif/InstrumentSerif-Latin-Italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
})
