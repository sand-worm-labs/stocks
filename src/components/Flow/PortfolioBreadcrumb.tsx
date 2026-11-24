import { AppLink } from "@/components/AppLink/AppLink"

export function PortfolioBreadcrumb({ name }: { name: string }) {
  return (
    <p className="text-ink-400 flex items-center gap-2 text-sm">
      <AppLink route="portfolios" className="hover:text-ink-100 transition-colors">
        Strategies
      </AppLink>
      /<span className="text-ink-100 font-medium">{name}</span>
    </p>
  )
}
