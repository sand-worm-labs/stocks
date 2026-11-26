import { PiPencilSimple } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { CountryFlag } from "@/components/CountryFlag/CountryFlag"
import { RegionPicker } from "@/components/Region/RegionPicker"
import { ReplayTourButton } from "@/components/Tour/ReplayTourButton"
import { resetOnboarding } from "@/lib/onboarding/actions"
import { countryName, isRegionSupported } from "@/lib/region/countries"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

export function AccountSection({ name, region }: { name: string; region: string }) {
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
      <SettingRow
        title="Where you live"
        description={
          <span className="flex items-center gap-2">
            <CountryFlag code={region} className="size-4" />
            {countryName(region)}
            {!isRegionSupported(region) && (
              <span className="text-amber-700 dark:text-amber-400">· not offered here</span>
            )}
          </span>
        }
      >
        <RegionPicker region={region} />
      </SettingRow>
      <SettingRow
        title="Guided tour"
        description="A 30-second walk through how an idea becomes a strategy you can trade."
      >
        <ReplayTourButton />
      </SettingRow>
      {process.env.NODE_ENV !== "production" && (
        <SettingRow
          title="First run (development only)"
          description="Shows the stepper, welcome window and tour again, as for a new account. Your account and strategies stay as they are."
        >
          <form action={resetOnboarding}>
            <button
              type="submit"
              className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
            >
              Reset
            </button>
          </form>
        </SettingRow>
      )}
    </SettingsSection>
  )
}
