import { CheckRow } from "@/components/Check/CheckRow"
import { countryName, isRegionSupported } from "@/lib/region/countries"

import { RegionPicker } from "./RegionPicker"

export function RegionCheckRow({ region }: { region: string }) {
  const supported = isRegionSupported(region)
  const name = countryName(region)

  return (
    <CheckRow
      status={supported ? "pass" : "warn"}
      title={`Where you live: ${name}`}
      description={
        supported
          ? "Tokenized stocks are offered outside the US. You confirm this once."
          : `Tokenized stocks aren't offered in ${name}.`
      }
      action={<RegionPicker region={region} />}
    />
  )
}
