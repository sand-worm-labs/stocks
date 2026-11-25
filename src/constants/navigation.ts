import type { IconType } from "react-icons"
import { PiBriefcase, PiChartLineUp, PiClockCounterClockwise, PiCoins, PiHouse, PiPlus } from "react-icons/pi"

import type { RouteId } from "@/config/routes"

type NavTab = { route: RouteId; icon: IconType; hasAlertCount?: boolean }

const HOME: NavTab = { route: "home", icon: PiHouse }
const PORTFOLIOS: NavTab = { route: "portfolios", icon: PiBriefcase }
const HOLDINGS: NavTab = { route: "holdings", icon: PiCoins }
const MARKETS: NavTab = { route: "markets", icon: PiChartLineUp }
const ACTIVITY: NavTab = { route: "activity", icon: PiClockCounterClockwise, hasAlertCount: true }

export const SECTIONS: NavTab[] = [HOME, PORTFOLIOS, HOLDINGS, MARKETS, ACTIVITY]

export const MOBILE_TABS: NavTab[] = [HOME, PORTFOLIOS, { route: "newPortfolio", icon: PiPlus }, MARKETS, ACTIVITY]
