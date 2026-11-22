import { PiPencilSimple } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

export function AccountSection({ name }: { name: string }) {
  return (
    <SettingsSection title="Account" description="Who you are.">
      <SettingRow title="Name" description={name}>
        <button
          type="button"
          className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 gap-1.5 px-3" })}
        >
          Edit
          <PiPencilSimple aria-hidden="true" />
        </button>
      </SettingRow>
    </SettingsSection>
  )
}
