import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { env } from "env.mjs"

const NAV_LINKS = [
  { name: "Home", href: env.NEXT_PUBLIC_LANDING_URL },
  { name: "Documentation", href: env.NEXT_PUBLIC_DOCS_URL },
]

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-5 md:px-10">
      <a href={env.NEXT_PUBLIC_LANDING_URL} className="flex items-center gap-2.5">
        <SandwormLogo size={32} />
        <span className="font-tertiary text-lg font-bold uppercase">Sandworm</span>
        <span className="font-body-mono border-beta-badge-border bg-beta-badge-bg text-beta-badge-text rounded-lg border px-2 py-0.5 text-xs">
          beta
        </span>
      </a>

      <nav aria-label="Main" className="font-body text-ink-400 hidden gap-8 text-sm font-medium md:flex">
        {NAV_LINKS.map(({ name, href }) => (
          <a key={name} href={href} className="hover:text-primary transition-colors">
            {name}
          </a>
        ))}
      </nav>

      <AppLink route="portfolios" className={buttonVariants({ intent: "dark", size: "md", className: "px-5" })}>
        Launch App
      </AppLink>
    </header>
  )
}
