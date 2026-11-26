import { cookies } from "next/headers"

import {
  NO_NOTIFICATION_STATE,
  NOTIFICATIONS_COOKIE,
  type NotificationState,
  parseNotificationState,
} from "./notifications"

// Which notifications have been read and put away, as the browser kept it, so the page is drawn with it already applied.
// Outside a request there is no cookie to read.
export async function getNotificationState(): Promise<NotificationState> {
  try {
    return parseNotificationState((await cookies()).get(NOTIFICATIONS_COOKIE)?.value)
  } catch {
    return NO_NOTIFICATION_STATE
  }
}
