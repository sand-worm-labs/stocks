import type { ReactNode } from "react"
import { PiCheckBold } from "react-icons/pi"

type CheckRowProps = { status: "pass" | "warn"; title: string; description: string; action: ReactNode }

function CheckMark({ status }: Pick<CheckRowProps, "status">) {
  return status === "pass" ? (
    <span aria-hidden="true" className="bg-primary flex size-7 flex-none items-center justify-center rounded-full">
      <PiCheckBold size={13} className="text-white" />
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="flex size-7 flex-none items-center justify-center rounded-full border-2 border-orange-600 bg-orange-50 text-sm font-semibold text-orange-700 dark:border-orange-500 dark:bg-orange-950 dark:text-orange-300"
    >
      !
    </span>
  )
}

export function CheckRow({ status, title, description, action }: CheckRowProps) {
  return (
    <div className="flex items-center gap-3.5 p-4">
      <CheckMark status={status} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-ink-400 text-sm">{description}</span>
      </div>
      {action}
    </div>
  )
}
