"use client"

import { PiArchive, PiArrowCounterClockwise, PiChecks } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { useNotifications } from "@/components/Notifications/NotificationsProvider"
import { Badge } from "@/components/ui/badge"

const BUTTON = buttonVariants({ intent: "outline", size: "sm", className: "min-h-8 min-w-0 gap-1.5 px-3 text-xs" })

// Beside the title of an alert: a dot while it is still to be read, and a tag once it is put away
export function NotificationDot({ id }: { id: string }) {
  const { isUnread, isArchived } = useNotifications()

  if (isArchived(id)) return <Badge>Archived</Badge>
  if (!isUnread(id)) return null

  return (
    <>
      <span className="sr-only">Unread</span>
      <span aria-hidden="true" className="bg-primary size-2 flex-none rounded-full" />
    </>
  )
}

// What can be done to one alert: read it, put it away, or when it is put away, bring it back
export function NotificationActions({ id }: { id: string }) {
  const { isUnread, isArchived, read, archive, unarchive } = useNotifications()

  if (isArchived(id)) {
    return (
      <button type="button" onClick={() => unarchive(id)} className={BUTTON}>
        <PiArrowCounterClockwise size={14} aria-hidden="true" />
        Restore
      </button>
    )
  }

  return (
    <>
      {isUnread(id) && (
        <button type="button" onClick={() => read(id)} className={BUTTON}>
          <PiChecks size={14} aria-hidden="true" />
          Mark read
        </button>
      )}
      <button type="button" onClick={() => archive(id)} className={BUTTON}>
        <PiArchive size={14} aria-hidden="true" />
        Archive
      </button>
    </>
  )
}
