import type { Activity } from "@/lib/activity/types"

const buy = (symbol: string, received: number): Activity => ({
  id: `bought-${symbol}`,
  kind: "bought",
  title: `Bought ${symbol}`,
  detail: `75 USDC → ${received} ${symbol}`,
  at: "2026-11-18T15:31:00",
  onchain: true,
})

export const activityMockData: Activity[] = [
  {
    id: "rules-checked",
    kind: "checked",
    title: "Checked your rules",
    detail: "Robotics, capped at 20% · all 4 hold",
    at: "2026-11-20T09:00:00",
  },
  {
    id: "tsla-alert",
    kind: "alert",
    title: "Price alert",
    detail: "TSLAc down 3.5% this week; stop-loss is off",
    at: "2026-11-20T08:12:00",
    action: { label: "Review", route: "portfolio", slug: "robotics-20" },
  },
  {
    id: "trade-refused",
    kind: "refused",
    title: "Refused a trade",
    detail: "“Put 40% in Tesla” breaks rule 2 · max 20% per stock",
    at: "2026-11-19T18:40:00",
    rule: "Rule 2",
  },
  {
    id: "weekend-gap",
    kind: "gap",
    title: "Weekend gap",
    detail: "NVDAc 0.6% above the share price",
    at: "2026-11-19T11:05:00",
  },
  buy("NVDAc", 0.5161),
  buy("AMZNc", 0.2915),
  buy("GOOGLc", 0.2737),
  buy("TSLAc", 0.2021),
  {
    id: "adapted",
    kind: "adapted",
    title: "Built a less-risk version",
    detail: "Worst drop −29.8% → −17.4%",
    at: "2026-11-18T15:20:00",
    action: { label: "Report →", route: "report", slug: "robotics-20" },
  },
  {
    id: "report-ready",
    kind: "report",
    title: "Strategy report ready",
    detail: "Some edge, mostly market risk",
    at: "2026-11-18T15:12:00",
    action: { label: "Report →", route: "report", slug: "robotics-20" },
  },
  {
    id: "rules-locked",
    kind: "locked",
    title: "Rules locked",
    detail: "4 rules for Robotics, capped at 20%",
    at: "2026-11-18T15:10:00",
  },
]
