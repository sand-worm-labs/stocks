import type { ReactNode } from "react"

export function HomeLayout({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
      <div className="flex flex-col gap-8">{children}</div>
      <div className="flex flex-col gap-6">{rail}</div>
    </div>
  )
}
