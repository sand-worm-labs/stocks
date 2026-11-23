import "@/styles/tailwind.css"

import type { Metadata } from "next"
import { CookieBanner } from "@/components/CookieBanner/CookieBanner"
import { Providers } from "@/components/Providers/Providers"
import { DynamicProviders } from "@/components/Wallet/DynamicProviders"
import { baseFont, preloadedFontPaths } from "@/config/fonts"

export const metadata: Metadata = {
  title: { default: "Sandworm Stocks", template: "%s · Sandworm Stocks" },
  description:
    "Tell an AI agent your investing goals. Get a researched, sourced portfolio of tokenized stocks, and trade it onchain once you approve.",
  icons: { icon: "/logo.svg" },
  openGraph: { siteName: "Sandworm", title: "Sandworm Stocks" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {preloadedFontPaths.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body className={`${baseFont.className} bg-page-surface text-ink-100`}>
        <Providers>
          <DynamicProviders>{children}</DynamicProviders>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
