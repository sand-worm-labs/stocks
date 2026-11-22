import type { ReactNode } from "react"
import { PiCheckBold } from "react-icons/pi"

import { cn } from "@/lib/utils"

type CheckRowProps = { status: "pass" | "warn"; title: string; description: string; action: ReactNode }

// Whether a check passed, as the web app's tick in a violet outline, round because it shows a result and isn't a choice
function StatusMark({ status }: Pick<CheckRowProps, "status">) {
  const passed = status === "pass"

  return (
    <span
      role="img"
      aria-label={passed ? "Passed" : "Not yet"}
      className={cn(
        "flex size-7 flex-none items-center justify-center rounded-full border-[1.5px]",
        passed ? "border-[#7F56D9] text-[#7F56D9]" : "dark:border-border-tertiary border-[#D0D5DD]"
      )}
    >
      {passed && <PiCheckBold size={14} aria-hidden="true" />}
    </span>
  )
}

export function CheckRow({ status, title, description, action }: CheckRowProps) {
  return (
    <div className="flex items-center gap-3.5 p-4">
      <StatusMark status={status} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-ink-400 text-sm">{description}</span>
      </div>
      {action}
    </div>
  )
}
