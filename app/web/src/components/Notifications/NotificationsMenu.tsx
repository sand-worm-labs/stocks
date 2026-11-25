"use client"

import Link from "next/link"
import { useState } from "react"
import { PiBell } from "react-icons/pi"

import { Tooltip } from "@/components/Tooltip/Tooltip"
import { IconTile } from "@/components/ui/icon-tile"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { routeHref } from "@/config/routes"
import { ACTIVITY_KIND } from "@/constants/activity"
import { ALL } from "@/constants/components/notifications/notifications-menu"
import { formatActivityTime } from "@/lib/dates"
import { NOTIFICATIONS_SHOWN } from "@/lib/notifications/notifications"
import { cn } from "@/lib/utils"
import { headerIconButtonClassName, listItemHoverClassName } from "@/styles/interactive"

import type { NotificationTab } from "@/types/ui"
import { NotificationsEmpty, NotificationTabs, NotificationToolbar } from "./NotificationControls"
import { useNotifications } from "./NotificationsProvider"

export function NotificationsMenu() {
  const { inbox, archived, unread, now, isUnread, read } = useNotifications()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NotificationTab>("inbox")

  const list = tab === "inbox" ? inbox : archived
  const close = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip title="Notifications">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
            className={headerIconButtonClassName}
          >
            <PiBell size={22} aria-hidden="true" />
            {unread > 0 && (
              <span className="bg-primary ring-block-surface absolute top-1.5 right-1.5 size-2 rounded-full ring-2" />
            )}
          </button>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="border-border-secondary dark:border-border-tertiary border-b px-5 py-3.5">
          <h2 className="font-medium">Notifications</h2>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <NotificationTabs value={tab} onChange={setTab} />
          {tab === "inbox" && <NotificationToolbar />}

          {list.length === 0 ? (
            <NotificationsEmpty tab={tab} />
          ) : (
            <ul className="flex flex-col gap-0.5">
              {list.slice(0, NOTIFICATIONS_SHOWN).map(({ id, kind, title, detail, at, action }) => {
                const isNew = tab === "inbox" && isUnread(id)
                const { icon } = ACTIVITY_KIND[kind]

                return (
                  <li key={id}>
                    <Link
                      href={(action && routeHref(action.route, undefined, action.slug)) || ALL}
                      onClick={() => {
                        if (isNew) read(id)
                        close()
                      }}
                      className={cn("flex items-start gap-3 px-2.5 py-2.5", listItemHoverClassName)}
                    >
                      <IconTile icon={icon} className="size-9 rounded-xl" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{title}</span>
                        <span className="text-ink-400 line-clamp-2 text-[13px] leading-5">{detail}</span>
                        <time dateTime={at} className="text-ink-400 mt-0.5 text-xs">
                          {formatActivityTime(at, now)}
                        </time>
                      </span>
                      {isNew && (
                        <>
                          <span className="sr-only">Unread</span>
                          <span aria-hidden="true" className="bg-primary mt-2 size-2 flex-none rounded-full" />
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {list.length > NOTIFICATIONS_SHOWN && (
          <Link
            href={ALL}
            onClick={close}
            className="border-border-secondary text-ink-400 hover:text-ink-100 dark:border-border-tertiary block border-t px-4 py-3 text-center text-sm font-medium transition-colors"
          >
            See all {list.length} →
          </Link>
        )}
      </PopoverContent>
    </Popover>
  )
}
