import { log } from "../../common/log.js"
import type { Plan } from "./plan.js"
import { USDC_DECIMALS } from "./provision.constants.js"

export function printPlans(plans: Plan[]): void {
  for (const plan of plans) {
    const usdc = Number(plan.usdcSeed) / USDC_DECIMALS
    log(`${plan.testSymbol.padEnd(10)} copies ${plan.mainnetPool}  fee ${plan.feeBps} bp  seed $${usdc.toLocaleString()} + the same in stock`)
  }
}
