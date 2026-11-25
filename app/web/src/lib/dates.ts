import { format, isSameDay, subDays } from "date-fns"

export const formatLongDate = (iso: string) => format(new Date(iso), "EEEE d MMM")
export const formatDay = (iso: string) => format(new Date(iso), "d MMM")
export const formatTime = (iso: string) => format(new Date(iso), "HH:mm")

export function formatDayLabel(iso: string, now: string) {
  if (isSameDay(new Date(iso), new Date(now))) return "Today"
  return isSameDay(new Date(iso), subDays(new Date(now), 1)) ? "Yesterday" : formatDay(iso)
}

export function formatActivityTime(iso: string, now: string) {
  const day = formatDayLabel(iso, now)
  return day === "Today" ? `Today ${formatTime(iso)}` : day
}

export const formatAsOf = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm")
