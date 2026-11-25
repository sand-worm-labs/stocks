import { describe, expect, it } from "vitest"

import { formatActivityTime, formatAsOf, formatDayLabel, formatLongDate, formatTime } from "./dates"

const NOW = "2026-11-20T14:20:00"

describe("dates", () => {
  it("writes the long date and the time", () => {
    expect(formatLongDate(NOW)).toBe("Friday 20 Nov")
    expect(formatTime("2026-11-20T09:00:00")).toBe("09:00")
  })

  it("says today with a time, yesterday, then the date", () => {
    expect(formatActivityTime("2026-11-20T09:00:00", NOW)).toBe("Today 09:00")
    expect(formatActivityTime("2026-11-19T16:30:00", NOW)).toBe("Yesterday")
    expect(formatActivityTime("2026-11-18T10:00:00", NOW)).toBe("18 Nov")
  })

  it("labels a day for grouping", () => {
    expect(formatDayLabel("2026-11-20T01:00:00", NOW)).toBe("Today")
    expect(formatDayLabel("2026-11-19T23:00:00", NOW)).toBe("Yesterday")
    expect(formatDayLabel("2026-11-18T15:31:00", NOW)).toBe("18 Nov")
  })

  it("stamps data with its date and time", () => {
    expect(formatAsOf("2026-11-20T02:50:00")).toBe("20 Nov 2026, 02:50")
  })
})
