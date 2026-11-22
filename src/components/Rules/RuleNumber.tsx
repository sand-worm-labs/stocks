import { cn } from "@/lib/utils"

// A rule's number: a small violet outline with the number in it, and no fill
export function RuleNumber({ children, className }: { children: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "border-primary text-primary flex size-5 flex-none items-center justify-center rounded-md border text-[11px] leading-none font-medium tabular-nums",
        className
      )}
    >
      {children}
    </span>
  )
}
