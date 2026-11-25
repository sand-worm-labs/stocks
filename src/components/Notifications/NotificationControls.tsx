"use client"

import type { ReactNode } from "react"
import type { IconType } from "react-icons"
import { PiArchive, PiChecks } from "react-icons/pi"

import { SegmentedControl } from "@/components/ui/segmented-control"
import { PILL, TABS } from "@/constants/components/notifications/notification-controls"
import { cn } from "@/lib/utils"

import type { NotificationTab } from "@/types/ui"
import { useNotifications } from "./NotificationsProvider"

export function NotificationTabs({
  value,
  onChange,
}: {
  value: NotificationTab
  onChange: (value: NotificationTab) => void
}) {
  return <SegmentedControl label="Show" options={TABS} value={value} onChange={onChange} fullWidth />
}

function PillButton({
  icon: Icon,
  disabled,
  onClick,
  children,
}: {
  icon: IconType
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        PILL,
        "border-border-secondary text-ink-200 dark:border-border-tertiary transition-colors outline-none",
        "hover:enabled:bg-hover-bg hover:enabled:border-hover-border hover:enabled:text-ink-100 dark:hover:enabled:bg-sidebar-hover",
        "focus-visible:ring-primary/50 focus-visible:ring-2 disabled:cursor-default disabled:opacity-50"
      )}
    >
      <Icon size={15} aria-hidden="true" />
      {children}
    </button>
  )
}

export function NotificationToolbar() {
  const { unread, inbox, isUnread, readAll, archiveRead } = useNotifications()
  const hasRead = inbox.some(({ id }) => !isUnread(id))

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn(PILL, "border-border-secondary text-ink-100 dark:border-border-tertiary tabular-nums")}>
        {unread} unread
      </span>
      <div className="flex gap-2">
        <PillButton icon={PiChecks} disabled={unread === 0} onClick={readAll}>
          Mark read
        </PillButton>
        <PillButton icon={PiArchive} disabled={!hasRead} onClick={archiveRead}>
          Archive read
        </PillButton>
      </div>
    </div>
  )
}

export function NotificationsEmpty({ tab }: { tab: NotificationTab }) {
  const { archived } = useNotifications()
  const [title, text] =
    tab === "archived"
      ? ["No archived notifications", "Archived notices will appear here."]
      : archived.length > 0
        ? ["You're all caught up", "The ones you put away are under Archived."]
        : ["No notifications yet", "Price alerts and notices from your agent will appear here."]

  return (
    <div className="bg-hover-bg flex flex-col items-center gap-1.5 rounded-2xl px-6 py-9 text-center dark:bg-white/5">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-ink-400 text-sm">{text}</p>
    </div>
  )
}
