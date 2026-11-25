import { Switch } from "@/components/ui/switch"
import { MAX_PER_STOCK_CHOICES, MIN_LIQUIDITY_CHOICES } from "@/constants/settings"
import { formatCompactUsd, formatPercent } from "@/lib/format"
import type { Settings } from "@/types/settings"

import { SettingRow } from "./SettingRow"
import { SettingSelect } from "./SettingSelect"
import { SettingsSection } from "./SettingsSection"

export function RulesSection({ rules }: { rules: Settings["rules"] }) {
  return (
    <SettingsSection title="Default rules for new strategies" description="They lock per strategy when you confirm.">
      <SettingRow title="Max in any one stock" tag="Rule 2" description="No stock can hold more than this share">
        <SettingSelect
          label="Max in any one stock"
          options={MAX_PER_STOCK_CHOICES.map((value) => ({ value: String(value), label: formatPercent(value) }))}
          defaultValue={String(rules.maxPerStock)}
        />
      </SettingRow>
      <SettingRow title="Minimum liquidity on Base" tag="Rule 3" description="Thinner markets are left out">
        <SettingSelect
          label="Minimum liquidity on Base"
          options={MIN_LIQUIDITY_CHOICES.map((value) => ({ value: String(value), label: formatCompactUsd(value) }))}
          defaultValue={String(rules.minLiquidity)}
        />
      </SettingRow>
      <SettingRow title="Ask before buying" description="Off lets the agent trade inside your rules">
        <Switch aria-label="Ask before buying" defaultChecked={rules.askBeforeBuying} />
      </SettingRow>
    </SettingsSection>
  )
}
