import { respond } from "@/lib/api/respond"
import { getCategories, getMarketSummary } from "@/lib/markets/source"

// How many stocks are listed and buyable, the themes they fall in, and the categories they are grouped into
export async function GET(request: Request) {
  return respond(request, {}, async () => ({ summary: await getMarketSummary(), categories: await getCategories() }))
}
