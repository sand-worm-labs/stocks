import { settingsMockData } from "@/_mockdata/settings"

import type { Settings } from "./types"

export async function getSettings(): Promise<Settings> {
  return settingsMockData
}
