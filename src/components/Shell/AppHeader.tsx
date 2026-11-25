import { PiGearSix } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { NotificationsMenu } from "@/components/Notifications/NotificationsMenu"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { Tooltip } from "@/components/Tooltip/Tooltip"
import { WalletMenu } from "@/components/Wallet/WalletMenu"
import { headerIconButtonClassName } from "@/styles/interactive"
import type { Session } from "@/types/session"

import { SectionTabs } from "./SectionTabs"
import { ThemeToggle } from "./ThemeToggle"

export function AppHeader({ session: { userId } }: { session: Session }) {
  return (
    <header className="border-border-secondary bg-block-surface dark:border-border-tertiary flex h-16 items-center gap-5 border-b px-4 select-none md:px-6">
      <AppLink route="home" className="flex items-center gap-2">
        <SandwormLogo size={26} />
        <span className="font-tertiary text-base font-bold uppercase">Sandworm</span>
        <span className="border-beta-badge-border bg-beta-badge-bg text-beta-badge-text font-tertiary rounded-lg border px-2 py-0.5 text-[0.6rem] lg:text-xs">
          stocks
        </span>
      </AppLink>

      <SectionTabs />

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <NotificationsMenu />
        <Tooltip title="Settings">
          <AppLink route="settings" className={headerIconButtonClassName}>
            <PiGearSix size={22} aria-label="Settings" />
          </AppLink>
        </Tooltip>
        <WalletMenu preload={userId ? "idle" : undefined} />
      </div>
    </header>
  )
}
