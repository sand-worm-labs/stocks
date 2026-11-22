import type { Metadata } from "next"

import { PageHeader } from "@/components/PageHeader/PageHeader"
import { AccountSection } from "@/components/Settings/AccountSection"
import { AppearanceSection } from "@/components/Settings/AppearanceSection"
import { ConnectorSection } from "@/components/Settings/ConnectorSection"
import { NotificationsSection } from "@/components/Settings/NotificationsSection"
import { RiskSection } from "@/components/Settings/RiskSection"
import { RulesSection } from "@/components/Settings/RulesSection"
import { WalletSection } from "@/components/Settings/WalletSection"
import { getSession } from "@/lib/session/source"
import { getSettings } from "@/lib/settings/source"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const [session, settings] = await Promise.all([getSession(), getSettings()])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader title="Settings" />
      <AccountSection name={session.user.firstName} />
      <AppearanceSection />
      <WalletSection session={session} testUsdc={settings.testUsdc} />
      <RiskSection risk={settings.risk} />
      <RulesSection rules={settings.rules} />
      <NotificationsSection notifications={settings.notifications} />
      <ConnectorSection url={settings.connectorUrl} />
    </div>
  )
}
