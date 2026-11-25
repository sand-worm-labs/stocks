import { Switch } from "@/components/ui/switch"
import type { Settings } from "@/types/settings"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

export function NotificationsSection({ notifications }: { notifications: Settings["notifications"] }) {
  return (
    <SettingsSection title="Notifications" description="Where the agent reaches you.">
      <SettingRow title="A rule would be broken" description="Always on">
        <Switch aria-label="A rule would be broken" checked disabled />
      </SettingRow>
      <SettingRow title="Daily summary" description="Your strategies at 09:00">
        <Switch aria-label="Daily summary" defaultChecked={notifications.dailySummary} />
      </SettingRow>
      <SettingRow title="Big price moves" description="Any holding moves more than 5% in a day">
        <Switch aria-label="Big price moves" defaultChecked={notifications.bigMoves} />
      </SettingRow>
    </SettingsSection>
  )
}
