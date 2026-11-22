import type { IconType } from "react-icons"
import { PiBuildings, PiCpu, PiHardDrives, PiQuestion, PiRobot, PiRocketLaunch } from "react-icons/pi"

export const ONBOARDING_COOKIES = {
  done: "sw_onboarded",
  welcome: "sw_welcome",
  name: "sw_name",
  interests: "sw_interests",
} as const

export const ONBOARDING_PATH = "/onboarding"

// What there is to choose to be interested in: the themes of stocks that can be researched and bought as tokens, each the
// id of a category of the market, and the way out for someone who doesn't know yet
export const NOT_SURE = "not-sure"

export const INTERESTS: { id: string; label: string; icon: IconType }[] = [
  { id: "ai", label: "AI and chips", icon: PiCpu },
  { id: "big-tech", label: "Big tech", icon: PiBuildings },
  { id: "robotics", label: "Robotics", icon: PiRobot },
  { id: "space", label: "Space and frontier", icon: PiRocketLaunch },
  { id: "hardware", label: "Hardware and memory", icon: PiHardDrives },
  { id: NOT_SURE, label: "Not sure yet", icon: PiQuestion },
]

export const STEPS = ["interests", "name", "checks", "start"] as const
export type OnboardingStep = (typeof STEPS)[number]

export const NAME_MAX_LENGTH = 40
