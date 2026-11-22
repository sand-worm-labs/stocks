import { z } from "zod"

import { ACTIVITY_FILTERS, ACTIVITY_KIND, type ActivityFilter, DEFAULT_ACTIVITY_FILTER } from "@/constants/activity"
import { formatDayLabel } from "@/lib/dates"

import type { Activity } from "./types"

export const parseActivityFilter = (value: unknown): ActivityFilter =>
  z.enum(ACTIVITY_FILTERS).catch(DEFAULT_ACTIVITY_FILTER).parse(value)

export const filterActivity = (activity: Activity[], filter: ActivityFilter) =>
  filter === "all" ? activity : activity.filter(({ kind }) => ACTIVITY_KIND[kind].category === filter)

// How many events each filter shows
export const activityCounts = (activity: Activity[]) =>
  Object.fromEntries(ACTIVITY_FILTERS.map((filter) => [filter, filterActivity(activity, filter).length])) as Record<
    ActivityFilter,
    number
  >

// The events under "Today", "Yesterday" and each earlier date, in the order they came
export const groupByDay = (activity: Activity[], now: string) =>
  Array.from(
    Map.groupBy(activity, ({ at }) => formatDayLabel(at, now)),
    ([label, events]) => ({ label, events })
  )
