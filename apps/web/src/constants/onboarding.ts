import type { IconType } from "react-icons"
import { PiBuildings, PiCpu, PiHardDrives, PiQuestion, PiRobot, PiRocketLaunch, PiSquaresFour } from "react-icons/pi"

export const ONBOARDING_COOKIES = {
  done: "sw_onboarded",
  welcome: "sw_welcome",
  name: "sw_name",
  interests: "sw_interests",
} as const

export const ONBOARDING_PATH = "/onboarding"

export const NOT_SURE = "not-sure"

// The interests offered are the categories marked for it in the database. Only how each is drawn is here; one with no icon of its own
// gets the plain one.
export const INTEREST_ICONS: Record<string, IconType> = {
  ai: PiCpu,
  "big-tech": PiBuildings,
  robotics: PiRobot,
  space: PiRocketLaunch,
  hardware: PiHardDrives,
}

export const DEFAULT_INTEREST_ICON: IconType = PiSquaresFour

export const NOT_SURE_INTEREST = { id: NOT_SURE, label: "Not sure yet", icon: PiQuestion }

export const STEPS = ["interests", "name", "checks", "start"] as const

export const NAME_MAX_LENGTH = 40
