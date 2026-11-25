import { AppLink } from "@/components/AppLink/AppLink"
import { TOKEN_TABS, type TokenTabId } from "@/constants/token"
import { cn } from "@/lib/utils"

export function TokenTabs({ tokenId, current }: { tokenId: string; current: TokenTabId }) {
  return (
    <nav
      aria-label="Token"
      className="border-border-secondary dark:border-border-tertiary -mx-4 flex gap-1 overflow-x-auto border-b px-4 md:mx-0 md:px-0"
    >
      {TOKEN_TABS.map(({ id, label }) => (
        <AppLink
          key={id}
          route="stock"
          slug={tokenId}
          query={{ tab: id }}
          isCurrent={id === current}
          className={cn(
            "-mb-px flex-none border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
            id === current ? "border-ink-100 text-ink-100" : "text-ink-400 hover:text-ink-100 border-transparent"
          )}
        >
          {label}
        </AppLink>
      ))}
    </nav>
  )
}
