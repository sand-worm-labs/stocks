import { HORIZON_OPTIONS, MAX_DRAWDOWN_CHOICES, RISK_GOAL_OPTIONS } from "@/constants/settings"
import { formatPercent } from "@/lib/format"
import type { Settings } from "@/lib/settings/types"

import { SettingRow } from "./SettingRow"
import { SettingSelect } from "./SettingSelect"
import { SettingsSection } from "./SettingsSection"

export function RiskSection({ risk }: { risk: Settings["risk"] }) {
  return (
    <SettingsSection
      title="Your risk profile"
      description="The agent pre-fills new briefs with this. You can change it per portfolio."
    >
      <SettingRow title="Goal" description="What you want most">
        <SettingSelect label="Goal" options={RISK_GOAL_OPTIONS} defaultValue={risk.goal} />
      </SettingRow>
      <SettingRow
        title="Loss you can live with"
        tag="Max drawdown limit"
        description="Backtests that fall further are flagged"
      >
        <SettingSelect
          label="Loss you can live with"
          options={MAX_DRAWDOWN_CHOICES.map((value) => ({ value: String(value), label: formatPercent(value) }))}
          defaultValue={String(risk.maxDrawdown)}
        />
      </SettingRow>
      <SettingRow title="Horizon" description="How long you plan to hold">
        <SettingSelect label="Horizon" options={HORIZON_OPTIONS} defaultValue={risk.horizon} />
      </SettingRow>
    </SettingsSection>
  )
}
