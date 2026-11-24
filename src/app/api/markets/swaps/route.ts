import { getRecentSwaps } from "@/lib/markets/swap-feed"

export const dynamic = "force-dynamic"

// The swaps of the last hour in the pools of the tokenized stocks, newest first
export async function GET() {
  try {
    return Response.json(await getRecentSwaps(), { headers: { "Cache-Control": "no-store" } })
  } catch {
    return Response.json({ error: "The node did not answer" }, { status: 502 })
  }
}
