import { describe, expect, it } from "vitest"

import {
  archive,
  archivedOf,
  archiveRead,
  inboxOf,
  markAllRead,
  markRead,
  NO_NOTIFICATION_STATE,
  notificationsOf,
  type NotificationState,
  parseNotificationState,
  serializeNotificationState,
  unarchive,
  unreadCount,
} from "@/lib/notifications/notifications"
import type { Activity } from "@/types/activity"


const event = (id: string, kind: Activity["kind"]): Activity => ({
  id,
  portfolioId: "p",
  kind,
  title: id,
  detail: "",
  at: "2026-11-20T08:12:00",
})

const items = notificationsOf([event("a", "alert"), event("b", "gap"), event("c", "alert"), event("t", "bought")])

describe("notifications", () => {
  it("are the alerts and the gaps, and nothing else the agent did", () => {
    expect(items.map(({ id }) => id)).toEqual(["a", "b", "c"])
  })

  it("count what has not been read, in the inbox", () => {
    expect(unreadCount(items, NO_NOTIFICATION_STATE)).toBe(3)
    expect(unreadCount(items, { read: ["a"], archived: [] })).toBe(2)
    expect(unreadCount(items, { read: [], archived: ["b"] })).toBe(2)
  })

  it("are read one at a time, once", () => {
    const state = markRead(NO_NOTIFICATION_STATE, "a")
    expect(state.read).toEqual(["a"])
    expect(markRead(state, "a")).toBe(state)
  })

  it("are all read at once, the inbox's only", () => {
    const state = markAllRead(items, { read: [], archived: ["b"] })
    expect(state.read.toSorted()).toEqual(["a", "c"])
    expect(unreadCount(items, state)).toBe(0)
  })

  it("put away the ones read, and keep the ones not", () => {
    const state = archiveRead(items, { read: ["a", "b"], archived: [] })
    expect(state.archived.toSorted()).toEqual(["a", "b"])
    expect(inboxOf(items, state).map(({ id }) => id)).toEqual(["c"])
    expect(archivedOf(items, state).map(({ id }) => id)).toEqual(["a", "b"])
  })

  it("are put away one at a time, read, and not twice", () => {
    const state = archive(NO_NOTIFICATION_STATE, "a")
    expect(state).toEqual({ read: ["a"], archived: ["a"] })
    expect(archive(state, "a")).toEqual(state)
    expect(unreadCount(items, state)).toBe(2)
  })

  it("come back from being put away, as read as they were", () => {
    const away = archive(NO_NOTIFICATION_STATE, "a")
    const back = unarchive(away, "a")
    expect(back).toEqual({ read: ["a"], archived: [] })
    expect(inboxOf(items, back).map(({ id }) => id)).toEqual(["a", "b", "c"])
    expect(unarchive(back, "a")).toBe(back)
  })

  it("don't put away the same one twice", () => {
    const once = archiveRead(items, { read: ["a"], archived: [] })
    expect(archiveRead(items, once).archived).toEqual(["a"])
  })

  it("are read back from what was kept, and nothing is made of anything else", () => {
    const kept: NotificationState = { read: ["a"], archived: ["b"] }
    expect(parseNotificationState(JSON.stringify(kept))).toEqual(kept)
    for (const bad of [null, "", "not json", "null", '{"read":"a","archived":[1,"b"]}']) {
      expect(parseNotificationState(bad).read).toEqual([])
    }
    expect(parseNotificationState('{"read":"a","archived":[1,"b"]}').archived).toEqual(["b"])
    expect(parseNotificationState(serializeNotificationState(kept))).toEqual(kept)
    expect(parseNotificationState("%E0%A4%A")).toEqual(NO_NOTIFICATION_STATE)
  })
})
