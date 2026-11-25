import type { IconType } from "react-icons"
import {
  PiBank,
  PiBuildings,
  PiCar,
  PiChartLineUp,
  PiCloud,
  PiCoins,
  PiCpu,
  PiCurrencyBtc,
  PiGameController,
  PiHeartbeat,
  PiLightning,
  PiRobot,
  PiRocketLaunch,
  PiShieldCheck,
  PiShoppingCart,
} from "react-icons/pi"

export const PORTFOLIO_ICONS: { pattern: RegExp; icon: IconType }[] = [
  { pattern: /robot|autonom|automation/i, icon: PiRobot },
  { pattern: /chip|semi|memory|silicon|compute|hardware/i, icon: PiCpu },
  { pattern: /crypto|bitcoin|coin|treasur/i, icon: PiCurrencyBtc },
  { pattern: /space|rocket|satellite/i, icon: PiRocketLaunch },
  { pattern: /health|biotech|obesity|pharma|medic/i, icon: PiHeartbeat },
  { pattern: /energy|nuclear|power|oil|solar/i, icon: PiLightning },
  { pattern: /bank|fintech|payment|financ/i, icon: PiBank },
  { pattern: /cloud|software|data|ai\b|infrastructure/i, icon: PiCloud },
  { pattern: /gold|mining|miner|dividend|cash/i, icon: PiCoins },
  { pattern: /consumer|retail|commerce|brand|travel/i, icon: PiShoppingCart },
  { pattern: /game|gaming|stream|media/i, icon: PiGameController },
  { pattern: /electric|vehicle|\bev\b|car/i, icon: PiCar },
  { pattern: /defen[cs]e|cyber|security/i, icon: PiShieldCheck },
  { pattern: /big tech|tech|compounder|balanced|small caps/i, icon: PiBuildings },
]

export const DEFAULT_PORTFOLIO_ICON: IconType = PiChartLineUp
