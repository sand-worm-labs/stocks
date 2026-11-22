import { assumptionMockData, rulesMockData, strategyMockData, unmeetableRulesMockData } from "@/_mockdata/rules"
import type { Portfolio } from "@/lib/portfolios/types"

export async function getRules({ status }: Portfolio) {
  return {
    rules: status === "unbuildable" ? unmeetableRulesMockData : rulesMockData,
    strategy: strategyMockData,
    assumption: assumptionMockData,
  }
}
