import { callStocksApi, stocksApiUrl } from "@/lib/api/stocks-api"

// 200 only when the app can keep what it needs to: with the Stocks API set, it has to answer. Anything else is a 503 that says so,
// instead of pages failing later.
export async function GET() {
  if (!stocksApiUrl()) return Response.json({ status: "ok", storage: "file" })

  try {
    await callStocksApi("/health")
    return Response.json({ status: "ok", storage: "api" })
  } catch {
    return Response.json({ status: "api unreachable" }, { status: 503 })
  }
}
