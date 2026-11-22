import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Option } from "@/constants/settings"

type SettingSelectProps = { label: string; options: Option[]; defaultValue: string }

export function SettingSelect({ label, options, defaultValue }: SettingSelectProps) {
  return (
    <Select defaultValue={defaultValue}>
      <SelectTrigger aria-label={label} className="flex-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
