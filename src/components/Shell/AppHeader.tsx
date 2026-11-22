import { PiBell, PiGearSix } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { NewPortfolioButton } from "@/components/Portfolios/NewPortfolioButton"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { Tooltip } from "@/components/Tooltip/Tooltip"
import { WalletMenu } from "@/components/Wallet/WalletMenu"
import type { Session } from "@/lib/session/types"
import { headerIconButtonClassName } from "@/styles/interactive"

import { SectionTabs } from "./SectionTabs"

export function AppHeader({ session: { unreadAlerts } }: { session: Session }) {
  return (
    <header className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-14 items-center gap-5 border-b px-4 md:px-6">
      <AppLink route="home" className="flex items-center gap-2">
        <SandwormLogo size={26} />
        <span className="font-tertiary text-base font-bold uppercase">Sandworm</span>
        <span className="border-beta-badge-border bg-beta-badge-bg text-beta-badge-text font-tertiary rounded-lg border px-2 py-0.5 text-[0.6rem] lg:text-xs">
          stocks
        </span>
      </AppLink>

      <SectionTabs unreadAlerts={unreadAlerts} />

      <div className="ml-auto flex items-center gap-1.5">
        <WalletMenu />
        <Tooltip title="Notifications">
          <AppLink route="activity" className={headerIconButtonClassName}>
            <PiBell size={22} aria-label={`Alerts, ${unreadAlerts} new`} />
            {unreadAlerts > 0 && (
              <span className="bg-primary ring-block-surface absolute top-1.5 right-1.5 size-2 rounded-full ring-2" />
            )}
          </AppLink>
        </Tooltip>
        <Tooltip title="Settings">
          <AppLink route="settings" className={headerIconButtonClassName}>
            <PiGearSix size={22} aria-label="Settings" />
          </AppLink>
        </Tooltip>
        <NewPortfolioButton className="hidden md:inline-flex" />
      </div>
    </header>
  )
}
