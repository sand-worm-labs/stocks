import { getAlpha2Codes } from "i18n-iso-countries"

import { RESTRICTED_REGIONS } from "@/constants/region"

export type Country = { code: string; name: string }

const names = new Intl.DisplayNames("en", { type: "region" })

export const countryName = (code: string) => names.of(code) ?? code

// Every country by its ISO code and name, in alphabetical order
export const COUNTRIES: Country[] = Object.keys(getAlpha2Codes())
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name))

export const isCountryCode = (value: unknown): value is string =>
  typeof value === "string" && COUNTRIES.some(({ code }) => code === value)

export const isRegionSupported = (code: string) => !RESTRICTED_REGIONS.includes(code)

// The round flag of a country, an open-source image (circle-flags), and not an emoji
export const flagUrl = (code: string) => `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`
