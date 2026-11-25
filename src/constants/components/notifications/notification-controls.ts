import type { NotificationTab } from "@/types/ui"

export const TABS: { value: NotificationTab; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "archived", label: "Archived" },
]

export const PILL = "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium"
