import { z } from "zod"

import { type IdParams, respond } from "@/lib/api/respond"
import { getStocks } from "@/lib/markets/source"
import { rulesSchema } from "@/lib/rules/spec"
import { rulesView } from "@/lib/strategies/rules-view"
import { getStrategyService } from "@/lib/strategies/source"

const editSchema = z.object({ rules: rulesSchema })

// A strategy's rules, in plain words with the setting behind each, and how close each is to its limit once it is trading
export async function GET(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, {}, async ({ ownerId }) => {
    const record = await getStrategyService().owned(ownerId, id)
    // Only a trading strategy has anything to be measured against today's prices
    const stocks = record.status === "live" ? await getStocks() : []
    return rulesView(record, stocks)
  })
}

// Replaces the rules of a strategy that is still being looked over. Once they are confirmed they can't be changed.
export async function PUT(request: Request, { params }: IdParams) {
  const { id } = await params

  return respond(request, { body: editSchema }, async ({ ownerId, body }) =>
    rulesView(await getStrategyService().editRules(ownerId, id, body.rules), [])
  )
}
